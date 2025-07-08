import numpy as np
import pandas as pd

from transformer.transform_list import TransformList
from ak_logger import logger, log_it

class AKDataTransformer:
    """ Managed transformations and gathers data necessary 
    for front-end visualization. """

    @log_it
    def __init__(self, data, transformations=[]):
        """ Constructor fot AKDataTransformer class 

        Args:
            data: The dataset to transform.
            transformations: List of previously applied transformations.
        """
        # High cardinality threshold
        self.high_card_thresh = 7

        self.corr_thresh = 0.5  # threshold for correlated
        self.coll_thresh = 0.9  # threshold for collinearity
        
        self.data = data
        self.transforms = TransformList()

        # apply previous transformations
        for trans in transformations:
            self.transforms.apply_transform(self.data, trans)
            
        
        self.reset_description()
        self.describe()

    @log_it        
    def reset_description(self):
        """ Resets the description dataframe. """
        columns = [
            "type","hasMiss", "countMiss", "missFunc",  "min", "25%", "50%", "75%",
            "max", "mean", "std", "outP", "count",                   
            "division", "countPrev", "divisionPrev", "countAll",
            "divisionAll", "corr", "coll", "hasHighCard", "card"
        ]
        
        # make the column names the index
        desc_index = pd.Index(self.data.columns, name='name')
        self.description = pd.DataFrame(columns=columns, index=desc_index)


    @log_it                
    def __describe_numerical(self, numcols):
        """ Creates a numerical description for the 'numcols' list. 

        Args:
            numcols: List of columns to create description for.
        """        
        if not numcols:
            return  # nothing to do
        
        logger.info("getting continuous summary statistics")
        numdescr = self.data.describe(numcols).T.drop(['count'], axis=1)        
        
        # set all the numeric summary statistics based on the description data frame
        self.description.loc[numdescr.index, numdescr.columns] = numdescr
        self.description.loc[numcols, "hasMiss"] = self.data.has_na(numcols)         

        logger.info("getting histogram data")
        batch_result = self.data.histograms_batch(numcols, nbins=30)
        
        for c, hist in zip(numcols, batch_result):
            vmin = self.description.loc[c, 'min']
            vmax = self.description.loc[c, 'max']
            logger.info("storing data for ", c)
            count, count_all, division = hist

            self.description.at[c, 'count'] = count
            self.description.at[c, 'division'] = list(division)
            self.description.at[c, "countPrev"] = count
            self.description.at[c, "divisionPrev"] = list(division)
            self.description.at[c, "countAll"] = count_all
            self.description.at[c, "divisionAll"] = list(division)

    @log_it        
    def __describe_nominal(self, catcols):
        """ Creates a nominal description for the 'catcols' list. 

        Args:
            catcols: List of columns to create description for.
        """
        if not catcols:
            return  # nothing to do
        
        logger.info("getting value counts")
        self.description.loc[catcols, "hasMiss"] = self.data.has_na(catcols) 
        batch_value_counts = self.data.value_counts_batch(catcols)
        batch_value_counts_all = self.data.value_counts_batch(catcols, filtered=False)        
        
        for c, vcounts, vcounts_all in zip(catcols, batch_value_counts, batch_value_counts_all):
            logger.info("getting value counts for ", c)
            count, division = vcounts
            count_all, division_all = vcounts_all
            
            logger.info("storing data...")            
            self.description.at[c, "min"] = np.nanmin(count)
            self.description.at[c, "max"] = np.nanmax(count)
            self.description.at[c, "mean"] = np.nanmean(count)
            self.description.at[c, "std"] = np.nanstd(count)
            self.description.at[c, "count"] = count
            self.description.at[c, "division"] = list(division)
            self.description.at[c, "countPrev"] = count
            self.description.at[c, "divisionPrev"] = list(division)
            self.description.at[c, "card"] = len(count)    
            self.description.at[c, "hasHighCard"] = len(count) > self.high_card_thresh

            self.description.at[c,"countAll"] = count_all
            self.description.at[c,"divisionAll"] = list(division_all)

    @log_it        
    def describe(self):
        """ Fills the description dataframe with descriptions for each column. """

        types = self.data.infer_types()
        self.description['type'] = types['type']

        logger.info("initialize base values")
        # initialize the columns
        self.description["missFunc"] = "None"
        self.description["count"] = np.empty((len(self.description), 0)).tolist()
        self.description["division"] = np.empty((len(self.description), 0)).tolist()
        self.description["corr"] = np.empty((len(self.description), 0)).tolist()
        self.description["coll"] = np.empty((len(self.description), 0)).tolist()
        self.description["outP"] =  0
        self.description["card"] = 0
        self.description["hasHighCard"] = False
        
        self.description["min"] = "none"
        self.description["max"] = "none"
        self.description["mean"] = "none"
        self.description["std"] = "none"
        missCount = self.data.count_na()
        self.description["countMiss"] = missCount
        self.description["hasMiss"] = missCount > 0 # set missing status
        
        logger.info("separate column types")
        catidx = self.description['type'].isin(['Nominal', 'Ordinal'])
        catcols = self.description[catidx].index.tolist()
        numcols = self.description[self.description['type'] == 'Numerical'].index.tolist()
        
        self.__describe_numerical(numcols)
        self.__describe_nominal(catcols)
        self.update_corr()
        

    @log_it        
    def __update_column_description_num(self, col):
        """ Creates the description for the Numerical column type. 
        
        Args:
            col: Column to update description for.
        """
        desc = self.data.describe_col(col)
        self.description.at[col, desc.index] = desc
        
        count, countAll, division = self.data.histograms(col, 30)
        self.description.at[col, "count"] = count
        self.description.at[col, "division"] = division   
        self.description.at[col, "countPrev"] = count
        self.description.at[col, "divisionPrev"] = division

        self.description.at[col, "countAll"] = countAll
        self.description.at[col, "divisionAll"] = division       
        self.description.at[col, "outP"] =  0 # to d0

    @log_it        
    def __update_column_description_cat(self, col):
        """ Creates the description for Nominal/Ordinal column type. 
        
        Args:
            col: Column to update description for.
        """
        count, division = self.data.value_counts(col)
        countAll, divisionAll = self.data.value_counts_all(col)
        
        self.description.at[col, "min"] = np.nanmin(count)
        self.description.at[col, "max"] = np.nanmax(count)
        self.description.at[col, "50%"] = np.nanmedian(count)
        self.description.at[col, "mean"] = np.nanmean(count)
        self.description.at[col, "std"] = np.nanstd(count)
        self.description.at[col, "count"] = count
        self.description.at[col, "division"] = division 
        self.description.at[col, "countPrev"] = count
        self.description.at[col, "divisionPrev"] = division     

        self.description.at[col, "countAll"] = countAll
        self.description.at[col, "divisionAll"] = divisionAll     

        self.description.at[col, "card"] = len(count)    
        self.description.at[col, "hasHighCard"] = len(count) > self.high_card_thresh
        
    @log_it        
    def update_column_description(self, col):
        """ Creates the description for a specific column 

        Args:
            col: Column to update description for.
        """
        if col not in self.data.columns:
            raise ValueError(f"{col} is not a valid column")
        
        missCount = self.data.count_na()
        self.description["countMiss"] = missCount
        self.description["hasMiss"] = missCount > 0
        self.description.at[col, "missFunc"] = "None"
        self.description.at[col, "count"] = []
        self.description.at[col, "division"] = []
        self.description.at[col, "corr"] = []
        self.description.at[col, "coll"] = []
        self.description.at[col, "outP"] =  0
        self.description.at[col, "card"] = 0
        self.description.at[col, "hasHighCard"] = False

        if self.description.at[col, "type"] == "Numerical":
            self.__update_column_description_num(col)
        elif self.description.at[col, "type"] in ["Nominal", "Ordinal"]:
            self.__update_column_description_cat(col)

        else:  # unhandled type
            self.description.at[col, "min"] = "none"
            self.description.at[col, "max"] = "none"
            self.description.at[col, "mean"] = "none"
            self.description.at[col, "std"] = "none"

    @log_it
    def update_description_log_transform(self, col, base):
        """ Updates the description after apply a log transform on col. 

        Args: 
            col: Column to update the description for.
            base: Base of the log.
        """
        logger.info("update log transform")
        # get the index corresponding to name
        row = self.description.loc[col]
        
        if not row["hasMiss"]:
            # negative values will turn to nans
            self.description.at[col, "hasMiss"] = row["min"] <= 0

        self.description.at[col, "missFunc"] = "None"
        self.description.at[col, "count"] = []
        self.description.at[col, "division"] = []
        self.description.at[col, "corr"] = []
        self.description.at[col, "coll"] = []
        self.description.at[col, "outP"] = 0
        self.description.at[col, "card"] = 0
        self.description.at[col, "hasHighCard"] = False

        if row["min"] > 0:
            self.description.at[col, "min"] = np.log(row["min"]) / np.log(base)
            self.description.at[col, "25%"] = np.log(row["25%"]) / np.log(base)
            self.description.at[col, "50%"] = np.log(row["50%"]) / np.log(base)
            self.description.at[col, "75%"] = np.log(row["75%"]) / np.log(base)
            self.description.at[col, "max"] = np.log(row["max"]) / np.log(base)

            # get the sampled mean and standard dev.
            self.description.at[col, "mean"] = self.data.mean(col)
            self.description.at[col, "std"] = self.data.std(col)
        else:
            desc = self.data.describe_col(col)
            self.description.at[col, "min"] = float(desc["min"])
            self.description.at[col, "25%"] = float(desc["25%"])
            self.description.at[col, "50%"] = float(desc["50%"])
            self.description.at[col, "75%"] = float(desc["75%"])
            self.description.at[col, "max"] = float(desc["max"]) 
            self.description.at[col, "mean"] = float(desc["mean"]) 
            self.description.at[col, "std"] = float(desc["std"])
            
        count, countAll, division = self.data.histograms(col, 30)

        self.description.at[col, "count"] = count
        self.description.at[col, "division"] = division   
        self.description.at[col, "countPrev"] = count
        self.description.at[col, "divisionPrev"] = division    
        
        self.description.at[col, "countAll"] = countAll
        self.description.at[col, "divisionAll"] = division

    @log_it        
    def update_description_normalize_transform(self, col, newmin, newmax):
        """ Updates the description after apply a normalize transform on col. 

        Args: 
            col: Column to update the description for.
            newmin: Lower bound of the norm.
            newmax: Upper bound of the norm.
        """
                
        # get the index corresponding to name
        row = self.description.loc[col]

        curmin, curmax = row['min'], row['max']
        new_range = newmax - newmin
        def apply_norm(val):
            """ Helper function for applying the norm. """
            return new_range * (val - curmin) / (curmax - curmin) + newmin

        # NOTE: hasMiss does not change with normalization.
        
        self.description.at[col, "missFunc"] = "None"
        self.description.at[col, "count"] = []
        self.description.at[col, "division"] = []
        self.description.at[col, "corr"] = []
        self.description.at[col, "coll"] = []
        self.description.at[col, "outP"] =  0
        self.description.at[col, "card"] = 0
        self.description.at[col, "hasHighCard"] = False
        
        self.description.at[col, "min"] = newmin
        self.description.at[col, "25%"] = apply_norm(row["25%"])
        self.description.at[col, "50%"] = apply_norm(row["50%"])
        self.description.at[col, "75%"] = apply_norm(row["75%"])
        self.description.at[col, "max"] = newmax
        
        # get the sampled mean and standard dev.
        self.description.at[col, "mean"] = self.data.mean(col)
        self.description.at[col, "std"] = self.data.std(col)
        
        count, countAll, division = self.data.histograms(col, 30)

        self.description.at[col, "count"] = count
        self.description.at[col, "division"] = division   
        self.description.at[col, "countPrev"] = count
        self.description.at[col, "divisionPrev"] = division    
        
        self.description.at[col, "countAll"] = countAll
        self.description.at[col, "divisionAll"] = division     


    @log_it        
    def update_description_clamp_transform(self, col, lb, ub):
        """ Updates the description after apply a clamp transform on col. 

        Args: 
            col: Column to update the description for.
            lb: Lower bound of the clamp.
            ub: Upper bound of the clamp.
        """
        
        # get the index corresponding to name
        row = self.description.loc[col]

        # NOTE: hasMiss does not change with clamp.
        
        self.description.at[col, "missFunc"] = "None"
        self.description.at[col, "count"] = []
        self.description.at[col, "division"] = []
        self.description.at[col, "corr"] = []
        self.description.at[col, "coll"] = []
        self.description.at[col, "outP"] =  0
        self.description.at[col, "card"] = 0
        self.description.at[col, "hasHighCard"] = False
        
        self.description.at[col, "min"] = min(max(row['min'], lb), ub)
        self.description.at[col, "25%"] = min(max(row["25%"], lb), ub)
        self.description.at[col, "50%"] = min(max(row["50%"], lb), ub)
        self.description.at[col, "75%"] = min(max(row["75%"], lb), ub)
        self.description.at[col, "max"] = min(max(row["max"], lb), ub)
        
        # get the sampled mean and standard dev.
        self.description.at[col, "mean"] = self.data.mean(col)
        self.description.at[col, "std"] = self.data.std(col)
        
        count, countAll, division = self.data.histograms(col, 30)

        self.description.at[col, "count"] = count
        self.description.at[col, "division"] = division   
        self.description.at[col, "countPrev"] = count
        self.description.at[col, "divisionPrev"] = division    
        
        self.description.at[col, "countAll"] = countAll
        self.description.at[col, "divisionAll"] = division       


    @log_it        
    def update_description_rename_transform(self, col, name):
        """ Renames the attribute 'col' to 'name' in the description. 
        
        Args:
            col: Attribute to rename
            name: Name to replace col with.
        """
        self.description.rename(index={col: name}, inplace=True)

    @log_it        
    def update_description_ohe_transform(self):
        """ Updates the description with the new attributes. """
        columns = self.data.columns

        # The newly created columns
        added = [c for c in columns if c not in self.description.index]
        
        # add new columns to description index
        self.description = self.description.reindex(columns)
        self.description.loc[added, 'type'] = 'Nominal'
        self.description.loc[added, 'countMiss'] = 0  # no missing by definition
        self.description.loc[added, 'hasMiss'] = False  # no missing by definition
        self.description.loc[added, 'missFunc'] = "None"
        
        # create descriptions for the added columns
        self.__describe_nominal(added)

    @log_it        
    def update_description_rank_transform(self):
        """ Updates the description with the new attributes. """
        columns = self.data.columns
        
        # The newly created columns
        added = [c for c in columns if c not in self.description.index]
        
        # add new columns to description index
        self.description = self.description.reindex(columns)
        self.description.loc[added, 'type'] = 'Nominal'
        self.description.loc[added, 'countMiss'] = 0  # no missing by definition
        self.description.loc[added, 'hasMiss'] = False  # no missing by definition
        self.description.loc[added, 'missFunc'] = "None"
        
        # create descriptions for the added columns
        self.__describe_nominal(added)        

    @log_it        
    def update_description_derived_transform(self, attr):
        """ Updates the description after a derived attribute is created. 

        Args:
            attr: Derived attribute name.
        """
        self.description.at[attr, 'type'] = self.data.get_type(attr)        
        self.update_column_description(attr)
        
    @log_it
    def apply_transform(self, transform, **kwargs):
        """ Applies the transform to the list of transformations 
        and updates the description. 

        Args:
            transform: Dict. describing the transform to apply.
        """
        trans_attr = self.transforms.apply_transform(self.data, transform)
        transform_type = transform['tType']

        # apply optimized update description methods where possible
        if transform_type == 'Log':
            attr, base = transform['attr'], transform['base']
            self.update_description_log_transform(attr, base)
            
        elif transform_type == 'Norm':
            attr, newmin, newmax = transform['attr'], transform['newmin'], transform['newmax']
            self.update_description_normalize_transform(attr, newmin, newmax)

        elif transform_type == 'Clamp':
            attr, newmin, newmax = transform['attr'], transform['lb'], transform['ub']
            self.update_description_clamp_transform(attr, newmin, newmax)
            
        elif transform_type == 'ColNameChange':
            attr, name = transform['attr'], transform['name']
            self.update_description_rename_transform(attr, name)

        elif transform_type == 'OHE':
            self.update_description_ohe_transform()

        elif transform_type == 'Rank':
            self.update_description_rank_transform()
                        
        elif transform_type == 'Derived':
            self.update_description_derived_transform(trans_attr)
            
        elif transform_type in ['Filter', 'FilterNom', 'Missing-Drop']:
            # Update the all descriptions
            catidx = self.description['type'].isin(['Nominal', 'Ordinal'])
            catcols = self.description[catidx].index.tolist()
            numcols = self.description[self.description['type'] == 'Numerical'].index.tolist()
            
            self.__describe_numerical(numcols)
            self.__describe_nominal(catcols)
             
        else:
            if transform_type == 'Dtype':
                self.description.at[trans_attr, 'type'] = transform['new_type']
                
            self.update_column_description(trans_attr)

        self.update_corr()

    @log_it
    def apply_multi_transform(self, mutlitransform, **kwargs):
        """ Applies the transform to the list of attributes 
        and updates the description. 

        Args:
            mutlitransform: Dict. describing the transform to apply.
        """
        
        transform_type = mutlitransform['tType']

        # apply optimized update description methods where possible
        if transform_type == 'Log':
            # Apply transform for each attribute in the list
            for a in mutlitransform['attr']:
                transform = {
                    'attr': a,
                    'tType': mutlitransform['tType'],
                    'base': mutlitransform['base'],
                }
                trans_attr = self.transforms.apply_transform(self.data, transform)
                attr, base = transform['attr'], transform['base']
                # Update descriptions for current attribute
                self.update_description_log_transform(attr, base)
            
        elif transform_type == 'Norm':
            # Apply transform for each attribute in the list
            for a in mutlitransform['attr']:
                transform = {
                    'attr': a,
                    'tType': mutlitransform['tType'],
                    'newmin': mutlitransform['newmin'],
                    'newmax': mutlitransform['newmax'],
                }
                trans_attr = self.transforms.apply_transform(self.data, transform)
                attr, newmin, newmax = transform['attr'], transform['newmin'], transform['newmax']
                # Update descriptions for current attribute
                self.update_description_normalize_transform(attr, newmin, newmax)
       
        elif transform_type == 'OHE':
            # Apply transform for each attribute in the list
            for a in mutlitransform['attr']:
                transform = {
                    'attr': a,
                    'tType': mutlitransform['tType'],
                }
                trans_attr = self.transforms.apply_transform(self.data, transform)
            # Update descriptions only after OHE has been applied to all selected attributes
            self.update_description_ohe_transform()        
            
        elif transform_type == 'Missing-Drop':
            # Apply transform for each attribute in the list
            for a in mutlitransform['attr']:
                transform = {
                    'attr': a,
                    'tType': mutlitransform['tType'],
                    'method': mutlitransform['method'],
                }
                trans_attr = self.transforms.apply_transform(self.data, transform)

            catidx = self.description['type'].isin(['Nominal', 'Ordinal'])
            catcols = self.description[catidx].index.tolist()
            numcols = self.description[self.description['type'] == 'Numerical'].index.tolist()
            
            # Update descriptions only after rows with missing values are dropped for selected attributes
            self.__describe_numerical(numcols)
            self.__describe_nominal(catcols)
        
        elif transform_type == 'Missing':
            # Apply transform for each attribute in the list
            for a in mutlitransform['attr']:
                transform = {
                    'attr': a,
                    'tType': mutlitransform['tType'],
                    'method': mutlitransform['method'],
                }
                trans_attr = self.transforms.apply_transform(self.data, transform)
                # Update descriptions for current attribute
                self.update_column_description(trans_attr)       

        self.update_corr()
    
    @log_it        
    def update_corr(self):
        """ Gets the correlation and updates the description dataframe"""
        corr = self.data.corr()

        # reset the correlation and colinear list in the description
        self.description["corr"] = np.empty((len(self.description), 0)).tolist()
        self.description["coll"] = np.empty((len(self.description), 0)).tolist()
        
        # get row and col indices where attributes are correlated
        row, col = np.where(corr.abs() >= self.corr_thresh)

        for c1, c2 in zip(row, col):
            if c1 == c2:  # ignore diagonal elements
                continue

            # get column names
            col1 = corr.columns[c1]
            col2 = corr.columns[c2]

            rho = corr.at[col1, col2]
            corr_info = {'name': col2, 'val': rho}
            
            self.description.at[col1, 'corr'].append(corr_info)

            # add colinear data if necessary
            if abs(rho) >= self.coll_thresh: 
                self.description.at[col1, 'coll'].append(corr_info)
                
    @log_it            
    def preview_filter(self, transform):
        """ Computes information necessary to render a preview of a filter.

        Args:
            transform: Dict. containing attr, lb, and ub for filter.
        """
        name = transform['attr']
        lb = transform['lb']
        ub = transform['ub']        
        count, division, countAll, divisionAll = self.data.preview_filter(name, lb, ub)

        self.description.at[name, "countPrev"] = count
        self.description.at[name, "divisionPrev"] = division
        self.description.at[name, "countAll"] = countAll
        self.description.at[name, "divisionAll"] = divisionAll

    @log_it        
    def remove_transform(self, uid=None):
        """ Removes a previously applied transformation. 

        Args:
            uid: Unique ID for the transform to remove 
                 (if None, removes the last transform).
        """
        if uid is None:
            uid = self.transforms.last_uid
            
        self.transforms.delete(uid)

        # Note: It would be nice to have a better way of undoing a
        # transformation other than resetting the entire dataset and
        # reapplying all transformations.
        self.data.reset_data()

        # apply any other transforms
        self.transforms.apply(self.data)

        # update description
        self.reset_description()
        self.describe()               

    @log_it
    def toggle_transform(self, uid):
        """ Disables a previously applied transformation. 

        Args:
            uid: Unique ID for the transform to remove.
        """
        # transform to toggle
        transform = self.transforms.get_transform_by_id(uid)

        if transform.enabled:
            self.transforms.disable(uid)
        else:
            self.transforms.enable(uid)

        # Note: See above
        self.data.reset_data()

        # apply any other transforms
        self.transforms.apply(self.data)

        # update the description
        self.reset_description()
        
        if self.get_counts()['filtered'] > 0:
            self.describe()               

    @log_it        
    def get_counts(self):
        """ Returns a dict. containing original and filtered sizes. """
        return self.data.get_counts()

    @log_it    
    def get_sampled_data(self, nrows=100):
        """ Returns a small sample of the data."""
        return self.data.get_sampled_data(nrows)

    @log_it
    def get_description(self):
        """ Returns the description dataframe. """
        return self.description.reset_index()

    @log_it    
    def get_transformations(self):
        """ Get a dictionary descriptions of the list of transformations. """
        return self.transforms.transformations()

    @staticmethod
    @log_it
    def get_transformed_data(data, transformations, deleted):
        """ Applies the list of transformations and returns the updated dataframe. 
    
        Args:
            data: SampledDataFrame to apply the transformations on.
            transformations: List of transformations to apply.
            deleted: List of attributes to drop.

        Returns:
            Transformed dataframe.
        """
        transforms = TransformList()
        
        for trans in transformations:
            transforms.apply_transform(data, trans)

        data.drop_columns(deleted)        
        return data
