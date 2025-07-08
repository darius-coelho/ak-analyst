from cmath import isnan
import unittest
import os
import shutil
import warnings
import sys
import inspect
import logging

import numpy as np
import pandas as pd

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data import Data
from transformer.data_transformer import AKDataTransformer


from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKDataTransformer(unittest.TestCase):
    """ Test the AKDataTransformer class. """

    def setUp(self):
        """ Create random data and store to a file. """
        N, M = 1000, 100
        columns = [f'col-{i}'for i in range(M)]
        X = np.random.normal(size=(N, M))
        X[:, 3] = X[:, 4] + np.random.normal(size=N)
        X[:, 5] = X[:, 6]  # colinear
        level_count = int(N/4)        

        df = pd.DataFrame(X, columns=columns)
        df['col-0'] = ['a'] * level_count \
                      + ['b'] * level_count \
                      + ['c'] * level_count \
                      + ['d'] * level_count

        df['col-10'] = pd.date_range(start='01/01/1988', periods=N)
        df['col-11'] = ['a'] * (N//2) + [np.nan] * (N//2)
        df['col-12'] = ['c'] * (N//2) + [np.nan] * (N//2)
        
        
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        df['col-2'] = 10  # set to constant

        os.mkdir(currentdir+'/test_data/')
        df.to_csv(currentdir+'/test_data/test_data.csv', index=False)
        
    def tearDown(self):
        """ Remove the random test data and directory. """
        shutil.rmtree(currentdir+'/test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

    def test_init(self):
        """ Test proper initialization. """        
        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath)
        akdt = AKDataTransformer(data)

        sample = akdt.get_sampled_data()
        self.assertEqual(len(sample.columns), data.shape[1])
        
        counts = akdt.get_counts()
        self.assertEqual(counts['original'], data.shape[0])
        self.assertEqual(counts['filtered'], data.shape[0])

        desc = akdt.get_description()        
        self.assertEqual(desc.shape[0], len(data.columns))
        self.assertEqual(desc.shape[1], 24)

        self.assertEqual(len(akdt.get_transformations()), 0)

    def test_init_transforms(self):
        """ Test passing previous transformations. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)

        init_transforms = [        
            {'attr': 'eps', 'tType': 'Filter', 'lb': -11.31, 'ub': 24.837193357655053},
            {'attr': 'return', 'tType': 'Norm', 'newmin': 0, 'newmax': 1},             
            {'attr': 'on_bal_vol',  'tType': 'Log', 'base': 10}
        ]

        # catch warnings related to log of negative values
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            akdt = AKDataTransformer(data, init_transforms)

        sample = akdt.get_sampled_data()
        self.assertEqual(len(sample.columns), data.shape[1])

        counts = akdt.get_counts()
        self.assertEqual(counts['original'], data.shape[0])
        self.assertEqual(counts['filtered'], data.shape[0]-2)

        desc = akdt.get_description()        
        self.assertEqual(desc.shape[0], len(data.columns))
        self.assertEqual(desc.shape[1], 24)
        
        transforms = akdt.get_transformations()
        self.assertEqual(len(transforms), len(init_transforms))
        
    def test_describe(self):      
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)
        
        akdt = AKDataTransformer(data)

        # load the default histogram
        akdt.preview_filter({'attr': 'asset_turnover'})
        desc = akdt.get_description()
        
        colDesc = data.describe_col("asset_turnover")

        self.assertEqual(desc.shape[0], len(data.columns))
        self.assertEqual(desc.shape[1], 24)
        
        self.assertEqual(desc.iloc[1]["name"], "asset_turnover")
        self.assertEqual(desc.iloc[1]["type"], "Numerical")
        self.assertFalse(desc.iloc[1]["hasMiss"])
        self.assertEqual(desc.iloc[1]["missFunc"], 'None')
        self.assertEqual(desc.iloc[1]["min"], colDesc["min"])
        self.assertEqual(desc.iloc[1]["25%"], colDesc["25%"])
        self.assertEqual(desc.iloc[1]["50%"], colDesc["50%"])
        self.assertEqual(desc.iloc[1]["75%"], colDesc["75%"])
        self.assertEqual(desc.iloc[1]["max"], colDesc["max"])
        self.assertEqual(desc.iloc[1]["mean"], colDesc["mean"])
        self.assertEqual(desc.iloc[1]["std"], colDesc["std"])
        self.assertFalse(desc.iloc[1]["hasHighCard"])
        self.assertEqual(desc.iloc[1]["card"], 0)       
        self.assertEqual(len(desc.iloc[1]["corr"]), 0)       
        self.assertEqual(len(desc.iloc[1]["coll"]), 0)       
        self.assertEqual(len(desc.iloc[1]["count"]), 30)       
        self.assertEqual(len(desc.iloc[1]["division"]), 31) 
        self.assertEqual(len(desc.iloc[1]["countAll"]), 30)       
        self.assertEqual(len(desc.iloc[1]["divisionAll"]), 31)
        self.assertEqual(len(desc.iloc[1]["countPrev"]), 30)       
        self.assertEqual(len(desc.iloc[1]["divisionPrev"]), 31)

        desc = akdt.get_description()        
        colDesc = data.describe_col("sector")        

        self.assertEqual(desc.shape[0], len(data.columns))
        self.assertEqual(desc.shape[1], 24)
        
        self.assertEqual(desc.iloc[19]["name"], "sector")
        self.assertEqual(desc.iloc[19]["type"], "Nominal")
        self.assertFalse(desc.iloc[19]["hasMiss"])
        self.assertEqual(desc.iloc[19]["missFunc"], 'None')
        self.assertEqual(desc.iloc[19]["min"], 21)
        
        self.assertTrue(np.isnan(desc.iloc[19]["25%"]))
        self.assertTrue(np.isnan(desc.iloc[19]["50%"]))
        self.assertTrue(np.isnan(desc.iloc[19]["75%"]))

        self.assertEqual(desc.iloc[19]["max"], colDesc["freq"])
        self.assertTrue(desc.iloc[19]["hasHighCard"])
        self.assertEqual(desc.iloc[19]["card"], 8)       

        self.assertEqual(len(desc.iloc[19]["corr"]), 0)       
        self.assertEqual(len(desc.iloc[19]["coll"]), 0)       
        self.assertEqual(len(desc.iloc[19]["count"]), 8)       
        self.assertEqual(len(desc.iloc[19]["division"]), 8) 
        self.assertEqual(len(desc.iloc[19]["countAll"]), 8)       
        self.assertEqual(len(desc.iloc[19]["divisionAll"]), 8)
        self.assertEqual(len(desc.iloc[19]["countPrev"]), 8)       
        self.assertEqual(len(desc.iloc[19]["divisionPrev"]), 8)

            
    def test_replace_filter_nom(self):
        """ Test corner case where filting on one attribute leads to a 
        another Nominal attribute to be all nans.
        """
        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath).sample_from_file()
        transformer = AKDataTransformer(data)

        tform_repl = {'attr': 'col-11', 'tType': 'Repl', 'old_vals': [np.nan], 'new_val': 'b'}
        tform_filt = {'attr': 'col-11', 'tType': 'FilterNom',
                      'filter_type': 'Include', 'filter_cats': ['b']}
        
        transformer.apply_transform(tform_repl)
        transformer.apply_transform(tform_filt)        

        # should not crash and the count should be 0
        self.assertEqual(transformer.description.at['col-12', 'max'], 0)
        
    def test_describe_col_num(self):              
        filepath = currentdir + '/test_data/test_data.csv'
         
        data = Data(filepath)
        
        akdt = AKDataTransformer(data)        
        
        # change the column
        akdt.data.data["col-1"] += 10
        akdt.data.data["col-1"].compute()
    
        col_desc = akdt.data.describe_col("col-1")
        akdt.update_column_description("col-1")
        desc = akdt.get_description()

        self.assertEqual(desc.iloc[1]["name"], "col-1")
        self.assertEqual(desc.iloc[1]["type"], "Numerical")
        self.assertFalse(desc.iloc[1]["hasMiss"])
        self.assertEqual(desc.iloc[1]["missFunc"], 'None')
        self.assertEqual(desc.iloc[1]["min"], col_desc["min"])
        self.assertEqual(desc.iloc[1]["25%"], col_desc["25%"])
        self.assertEqual(desc.iloc[1]["50%"], col_desc["50%"])
        self.assertEqual(desc.iloc[1]["75%"], col_desc["75%"])
        self.assertEqual(desc.iloc[1]["max"], col_desc["max"])
        self.assertEqual(desc.iloc[1]["mean"], col_desc["mean"])
        self.assertEqual(desc.iloc[1]["std"], col_desc["std"])
        self.assertFalse(desc.iloc[1]["hasHighCard"])
        self.assertEqual(desc.iloc[1]["card"], 0)

        self.assertEqual(desc.iloc[1]["division"][0], col_desc['min'])

    def test_describe_col_datetime(self):              
        filepath = currentdir + '/test_data/test_data.csv'
         
        data = Data(filepath)
        
        akdt = AKDataTransformer(data)        
           
        col_desc = akdt.data.describe_col("col-10")

        akdt.update_column_description("col-10")
        desc = akdt.get_description()
        
        self.assertEqual(desc.iloc[1]["name"], "col-1")
        self.assertEqual(desc.iloc[1]["type"], "Numerical")
        self.assertFalse(desc.iloc[1]["hasMiss"])
        self.assertEqual(desc.iloc[1]["missFunc"], 'None')

        self.assertFalse(desc.iloc[1]["hasHighCard"])
        self.assertEqual(desc.iloc[1]["card"], 0)
        self.assertEqual(desc.iloc[10]["division"][0], '1988-01-01')

        
    def test_describe_col_num_all_nan(self):              
        filepath = currentdir + '/test_data/test_data.csv'
         
        data = Data(filepath)
        
        akdt = AKDataTransformer(data)        
        
        # change the column
        akdt.data.data["col-1"] = np.nan
        akdt.data.data["col-1"].compute()
    
        akdt.update_column_description("col-1")
        desc = akdt.get_description()

        self.assertEqual(desc.iloc[1]["name"], "col-1")
        self.assertEqual(desc.iloc[1]["type"], "Numerical")
        self.assertTrue(desc.iloc[1]["hasMiss"])
        self.assertEqual(desc.iloc[1]["countMiss"], akdt.data.shape[0])
        self.assertEqual(desc.iloc[1]["missFunc"], 'None')
        self.assertTrue(isnan(desc.iloc[1]["min"]))
        self.assertTrue(isnan(desc.iloc[1]["25%"]))
        self.assertTrue(isnan(desc.iloc[1]["50%"]))
        self.assertTrue(isnan(desc.iloc[1]["75%"]))
        self.assertTrue(isnan(desc.iloc[1]["max"]))
        self.assertTrue(isnan(desc.iloc[1]["mean"]))
        self.assertTrue(isnan(desc.iloc[1]["std"]))
        self.assertFalse(desc.iloc[1]["hasHighCard"])
        self.assertEqual(desc.iloc[1]["card"], 0)        

    def test_describe_col_cat(self):      
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        akdt = AKDataTransformer(data)        
        
        # change the column
        akdt.data.apply_filter("col-1", 1)
        
        col_desc = akdt.data.describe_col("col-0")
        akdt.update_column_description("col-0")
        desc = akdt.get_description()

        vcounts = akdt.data.filter_data['col-0'].value_counts().compute()
        
        self.assertEqual(desc.iloc[0]["name"], "col-0")
        self.assertEqual(desc.iloc[0]["type"], "Nominal")
        self.assertFalse(desc.iloc[0]["hasMiss"])
        self.assertEqual(desc.iloc[0]["missFunc"], 'None')
        self.assertEqual(desc.iloc[0]["min"], min(vcounts))
        self.assertEqual(desc.iloc[0]["max"], max(vcounts))
        self.assertEqual(desc.iloc[0]["mean"], np.nanmean(vcounts))
        self.assertFalse(desc.iloc[0]["hasHighCard"])
        self.assertEqual(desc.iloc[0]["card"], 4)

    def test_apply_log_transform(self):
        """ Test applying a log transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        
        tform = {'attr': 'col-2', 'tType': 'Log', 'base': 10}
        transformer.apply_transform(tform)
        desc = transformer.get_description()

        # col-2 is a constant vector with value 10
        self.assertEqual(desc.at[2, 'min'], 1)
        self.assertEqual(desc.at[2, 'max'], 1)
        self.assertEqual(desc.at[2, 'mean'], 1)
        self.assertEqual(desc.at[2, 'std'], 0)
        self.assertFalse(desc.at[2, 'hasMiss'])
        
        pre_desc = transformer.get_description()
        
        # Log transform with negative values
        tform_neg = {'attr': 'col-1', 'tType': 'Log', 'base': 10}

        # Hide warnings due to negative logs
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            transformer.apply_transform(tform_neg)
            
        desc = transformer.get_description()

        # col-1 has negative values which have invalid logs
        self.assertNotEqual(desc.at[1, 'min'], pre_desc.at[1, 'min'])
        self.assertEqual(desc.at[1, 'max'], np.log(pre_desc.at[1, 'max']) / np.log(10))
        self.assertTrue(desc.at[1, 'hasMiss'])

    def test_apply_norm_transform(self):
        """ Test applying a norm transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        
        tform = {'attr': 'col-1', 'tType': 'Norm', 'newmin': 1, 'newmax': 2}
        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertEqual(desc.at[1, 'min'], 1)
        self.assertEqual(desc.at[1, 'max'], 2)
        self.assertFalse(desc.at[1, 'hasMiss'])

    def test_apply_clamp_transform(self):
        """ Test applying a clamp transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        
        tform = {'attr': 'col-1', 'tType': 'Clamp', 'lb': 1, 'ub': 2}
        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertEqual(desc.at[1, 'min'], 1)
        self.assertEqual(desc.at[1, 'max'], 2)
        self.assertFalse(desc.at[1, 'hasMiss'])

    def test_apply_rename_transform(self):
        """ Test applying a rename transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)

        pre_desc =  transformer.get_description()
        tform = {'attr': 'col-1', 'tType': 'ColNameChange', 'name': 'column-one'}
        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertEqual(desc.at[1, 'min'], pre_desc.at[1, 'min'])
        self.assertEqual(desc.at[1, 'max'], pre_desc.at[1, 'max'])
        self.assertEqual(desc.at[1, 'mean'], pre_desc.at[1, 'mean'])
        self.assertEqual(desc.at[1, 'name'], 'column-one')
        self.assertFalse('col-1' in desc['name'].tolist())

    def test_apply_replace_transform(self):
        """ Test applying a replace transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)

        pre_desc =  transformer.get_description()
        tform = {'attr': 'col-0', 'tType': 'Repl', 'old_vals': ['a'], 'new_val': 'b'}
        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertEqual(desc.at[0, 'card'], 3)
        self.assertEqual(desc.at[0, 'max'], data.shape[0] / 2)

    def test_apply_impute_transform(self):
        """ Test applying a imputation transform. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc = data.columns.index('liquidity')

        pre_desc =  transformer.get_description()
        self.assertTrue(pre_desc.at[loc, 'hasMiss'])
        
        tform = {'attr': 'liquidity', 'tType': 'Missing', 'method': 'Zero', 'replaceVal': None}

        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertFalse(desc.at[loc, 'hasMiss'])

    def test_apply_drop_na(self):
        """ Test applying a drop na transform. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc = data.columns.index('liquidity')

        pre_desc =  transformer.get_description()
        self.assertTrue(pre_desc.at[loc, 'hasMiss'])
        
        tform = {'attr': 'liquidity', 'tType': 'Missing-Drop', 'method': 'Drop', 'new_val': 'b'}

        transformer.apply_transform(tform)
        desc = transformer.get_description()        
        self.assertFalse(desc.at[loc, 'hasMiss'])
        counts = transformer.get_counts()
        self.assertLess(counts['filtered'], counts['original'])
        
    def test_apply_filter_transform(self):
        """ Test applying a imputation transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
     
        tform = {'attr': 'col-1', 'tType': 'Filter', 'lb': 0}

        # no filter applied yet
        pre_counts = transformer.get_counts()
        self.assertEqual(pre_counts['filtered'], pre_counts['original'])
        
        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertGreaterEqual(desc.at[1, 'min'], 0)
        self.assertGreaterEqual(desc.at[1, 'mean'], 0)
        counts = transformer.get_counts()
        
        self.assertLess(counts['filtered'], counts['original'])

    def test_apply_cell_split_transform(self):
        """ Test applying a cell splitting transform. """
        filepath = parentdir+"/data/final_track_data.csv"
        data = Data(filepath, delay_load=False, options={'encoding': 'utf-8'})

        transformer = AKDataTransformer(data)
        tform = {'tType': "CellSplit", "attr": 'artist_genre',
                 'delimiter': ',', 'ordered': True, 'strip': '[]', 'quote': "'"}

        transformer.apply_transform(tform)
        desc = transformer.get_description()

        desc.set_index('name', inplace=True)
        added = ['artist_genre_pos_0', 'artist_genre_pos_1',
                 'artist_genre_pos_2', 'artist_genre_pos_3']
        for c in added:
            self.assertTrue(c in desc.index.tolist())

        self.assertTrue(np.all(desc.loc[added, 'type'] == 'Nominal'))

        
    def test_apply_ohe_transform(self):
        """ Test applying a one-hot-encoding transform. """
        filepath = currentdir + '/test_data/test_data.csv'
 
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
     
        tform = {'attr': 'col-0', 'tType': 'OHE'}
        transformer.apply_transform(tform)
        
        desc = transformer.get_description()
        added = ['col-0_a', 'col-0_b', 'col-0_c', 'col-0_d']

        desc.set_index('name', inplace=True)
        
        self.assertEqual(desc.shape[0], 104)
        for c in added:
            self.assertTrue(c in desc.index.tolist())
            
        self.assertTrue(np.all(desc.loc[added, 'type'] == 'Nominal'))
        self.assertTrue(np.all(desc.loc[added, 'hasMiss'] == False))
        self.assertTrue(np.all(desc.loc[added, 'min'] == 250))
        self.assertTrue(np.all(desc.loc[added, 'max'] == 750))
        self.assertTrue(np.all(desc.loc[added, 'card'] == 2))

    
    def test_apply_ohe_bind_transform(self):
        """ Test applying a one-hot-encoding transform with binding. """
        filepath = currentdir + '/test_data/test_data.csv'
 
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
     
        tform = {'attr': 'col-0', 'tType': 'OHE', 'bind': 'col-1'}
        transformer.apply_transform(tform)
        
        desc = transformer.get_description()
        added = ['col-0_a_col-1', 'col-0_b_col-1',
                 'col-0_c_col-1', 'col-0_d_col-1']

        desc.set_index('name', inplace=True)
        
        self.assertEqual(desc.shape[0], 104)
        for c in added:
            self.assertTrue(c in desc.index.tolist())

        
        self.assertTrue(np.all(desc.loc[added, 'type'] == 'Numerical'))
        self.assertTrue(np.all(desc.loc[added, 'hasMiss'] == True))
        transformer.preview_filter({'attr': added[0]})
        
    def test_apply_rank_transform(self):
        """ Test applying a imputation transform. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
     
        tform = {'attr': 'col-0', 'rankattr': 'col-42', 'ranktiers': 3, 'tType': 'Rank'}
        transformer.apply_transform(tform)
        
        desc = transformer.get_description()
        added = 'col-0_rank3_col-42'       
        desc.set_index('name', inplace=True)
        self.assertTrue(added in desc.index.tolist())
                
        self.assertEqual(desc.shape[0], 101)            
        self.assertEqual(desc.loc[added, 'type'], 'Nominal')
        self.assertFalse(desc.loc[added, 'hasMiss'])
        self.assertEqual(desc.loc[added, 'card'], 3)
        
    def test_apply_custom_transform(self):
        """ Test applying a custom transform. """        
        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)

        pre_desc = transformer.get_description()
        tform = {'attr': 'col-1', 'tType': 'Custom', 'expr': 'col-1 + 10'}
        transformer.apply_transform(tform)
        
        desc = transformer.get_description()
        self.assertEqual(desc.loc[1, 'min'], pre_desc.loc[1, 'min'] + 10)
        self.assertEqual(desc.loc[1, 'max'], pre_desc.loc[1, 'max'] + 10)
        self.assertAlmostEqual(desc.loc[1, 'mean'], pre_desc.loc[1, 'mean'] + 10)
        self.assertAlmostEqual(desc.loc[1, 'std'], pre_desc.loc[1, 'std'])
        
    def test_apply_derived_transform(self):
        """ Test applying a derived transform. """        
        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)

        pre_desc = transformer.get_description()
        tform = {'attr': 'derived', 'tType': 'Derived', 'expr': 'col-1 * col-2'}
        transformer.apply_transform(tform)

        desc = transformer.get_description()
        desc.set_index('name', inplace=True)

        self.assertEqual(desc.shape[0], 101)
        self.assertTrue('derived' in desc.index.tolist())

        self.assertEqual(desc.at['derived', 'type'], 'Numerical')

        # Note: col-2 is a constant vector with value 10
        self.assertEqual(desc.at['derived', 'min'], desc.at['col-1', 'min'] * 10)
        self.assertEqual(desc.at['derived', 'max'], desc.at['col-1', 'max'] * 10)
        self.assertAlmostEqual(desc.at['derived', 'mean'], desc.at['col-1', 'mean'] * 10)

    def test_apply_ordering_transform(self):
        """ Test applying a ordering transform. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc = data.columns.index('gender')

        pre_desc =  transformer.get_description()
        self.assertEqual(pre_desc.at[loc, 'type'], "Nominal")
        
        tform = {'attr': 'gender', 'tType': 'Dtype', 'new_type': 'Ordinal', 'ordering': ["Female", "Male", "Other"]}

        transformer.apply_transform(tform)
        desc = transformer.get_description()

        self.assertEqual(desc.at[loc, 'type'], "Ordinal")
        self.assertTrue(type(desc.at[loc, 'ordering']) is list)
        self.assertListEqual(desc.at[loc, 'ordering'], ["Female", "Male", "Other"])

        tform2 = {'attr': 'gender', 'tType': 'OrdinalOrder', 'ordering': ["Other", "Male", "Female"]}
        transformer.apply_transform(tform2)
        desc = transformer.get_description()
        self.assertEqual(desc.at[loc, 'type'], "Ordinal")
        self.assertTrue(type(desc.at[loc, 'ordering']) is list)
        self.assertListEqual(desc.at[loc, 'ordering'], ["Other", "Male", "Female"])        


    def test_update_corr(self):
        """ Test correlation. """        
        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)

        # Note: update_corr is called in the constructor.
        # We call it again here to make sure no duplicates
        # are being added.
        transformer.update_corr()
        
        desc = transformer.get_description()

        self.assertEqual(len(desc.at[3, 'corr']), 1)
        self.assertEqual(len(desc.at[4, 'corr']), 1)
        self.assertEqual(len(desc.at[5, 'corr']), 1)
        self.assertEqual(len(desc.at[6, 'corr']), 1)
        
        self.assertEqual(len(desc.at[3, 'coll']), 0)
        self.assertEqual(len(desc.at[4, 'coll']), 0)
        self.assertEqual(len(desc.at[5, 'coll']), 1)
        self.assertEqual(len(desc.at[6, 'coll']), 1)
        
    def test_preview_filter(self): 
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)        
        transform = {
            'attr': 'dividend',
            'tType': "Filter",
            'lb': 1,
            'ub': 9,
        }

        transformer = AKDataTransformer(data)
        
        # load the default histogram
        transformer.preview_filter({'attr': 'dividend'})  
        pre_desc = transformer.get_description()
        self.assertTrue('dividend' in pre_desc.name.tolist())
        
        transformer.preview_filter(transform)
        desc = transformer.get_description()
        self.assertTrue('dividend' in desc.name.tolist())        

        desc.set_index('name', inplace=True)        
        pre_desc.set_index('name', inplace=True)

        # None of the statistics should change
        self.assertEqual(desc.at["dividend", "min"], pre_desc.at["dividend", "min"])
        self.assertEqual(desc.at["dividend", "25%"], pre_desc.at["dividend", "25%"])
        self.assertEqual(desc.at["dividend", "50%"], pre_desc.at["dividend", "50%"])
        self.assertEqual(desc.at["dividend", "75%"], pre_desc.at["dividend", "75%"])
        self.assertEqual(desc.at["dividend", "max"], pre_desc.at["dividend", "max"])
        self.assertEqual(desc.at["dividend", "mean"], pre_desc.at["dividend", "mean"])
        self.assertEqual(desc.at["dividend", "std"], pre_desc.at["dividend", "std"])

        self.assertListEqual(desc.at["dividend", "count"].tolist(),
                             pre_desc.at["dividend", "count"].tolist())
        self.assertListEqual(desc.at["dividend", "division"].tolist(),
                             pre_desc.at["dividend", "division"].tolist())
        
        self.assertEqual(len(desc.at["dividend", "countAll"]),
                         len(pre_desc.at["dividend", "countAll"]))

        self.assertEqual(len(desc.at["dividend", "divisionAll"]),
                         len(pre_desc.at["dividend", "divisionAll"]))
        
        self.assertEqual(len(desc.at["dividend", "countPrev"]),
                         len(pre_desc.at["dividend", "countPrev"]))

        self.assertEqual(len(desc.at["dividend", "divisionPrev"]),
                         len(pre_desc.at["dividend", "divisionPrev"]))

        
        self.assertFalse(np.all(desc.at["dividend", "countAll"] \
                                == pre_desc.at["dividend", "countAll"]))

        self.assertFalse(np.all(desc.at["dividend", "divisionAll"] \
                                == pre_desc.at["dividend", "divisionAll"]))

        self.assertFalse(np.all(desc.at["dividend", "countPrev"] \
                                == pre_desc.at["dividend", "countPrev"]))

        self.assertFalse(np.all(desc.at["dividend", "divisionPrev"] \
                                == pre_desc.at["dividend", "divisionPrev"]))


    def test_preview_filter_datetime(self):
        """ Test previewing filter for datetime type. """
        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath)

        data.set_type('col-10', 'DateTime')
        transformer = AKDataTransformer(data)
        transformer.preview_filter({'attr': 'col-10'})

        desc = transformer.get_description()
        self.assertTrue('col-10' in desc.name.tolist())
        self.assertEqual(desc.iloc[10]['type'], 'DateTime')

        transformer.preview_filter({'attr': 'col-10', 'lb': '1989-01-01'})

        desc = transformer.get_description()
        self.assertTrue('col-10' in desc.name.tolist())
        self.assertEqual(desc.iloc[10]['type'], 'DateTime')


    def test_apply_multi_log_transform(self):
        """ Test applying a log transform to multiple attributes. """        
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        pre_desc = transformer.get_description()
        
        tform = {'attr': ['col-1', 'col-2'], 'tType': 'Log', 'base': 10}
        # Hide warnings due to negative logs in col-1        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            transformer.apply_multi_transform(tform)

        desc = transformer.get_description()

        # col-1 has negative values which have invalid logs
        self.assertNotEqual(desc.at[1, 'min'], pre_desc.at[1, 'min'])
        self.assertEqual(desc.at[1, 'max'], np.log(pre_desc.at[1, 'max']) / np.log(10))
        self.assertTrue(desc.at[1, 'hasMiss'])

        # col-2 is a constant vector with value 10
        self.assertEqual(desc.at[2, 'min'], 1)
        self.assertEqual(desc.at[2, 'max'], 1)
        self.assertEqual(desc.at[2, 'mean'], 1)
        self.assertEqual(desc.at[2, 'std'], 0)
        self.assertFalse(desc.at[2, 'hasMiss'])

    def test_apply_multi_norm_transform(self):
        """ Test applying a normalization transform to multiple attributes. """        
        filepath = parentdir+"/data/sp500_data_rn.csv"

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc1 = data.columns.index('price')
        loc2 = data.columns.index('return')

        pre_desc = transformer.get_description()

        # price 
        self.assertNotEqual(pre_desc.at[loc1, 'min'], 1)
        self.assertNotEqual(pre_desc.at[loc1, 'max'], 2)   

        # return 
        self.assertNotEqual(pre_desc.at[loc2, 'min'], 1)
        self.assertNotEqual(pre_desc.at[loc2, 'max'], 2)   
        
        tform = {'attr': ['price', 'return'], 'tType': 'Norm', 'newmin': 1, 'newmax': 2}        
        transformer.apply_multi_transform(tform)

        desc = transformer.get_description()

        # price 
        self.assertEqual(desc.at[loc1, 'min'], 1)
        self.assertEqual(desc.at[loc1, 'max'], 2)        

        # return
        self.assertEqual(desc.at[loc2, 'min'], 1)
        self.assertEqual(desc.at[loc2, 'max'], 2)

    def test_apply_multi_outlier_removal_transform(self):
        """ Test applying a normalization transform to multiple attributes. """        
        filepath = parentdir+"/data/sp500_data_rn.csv"

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc1 = data.columns.index('operating_leverage')
        loc2 = data.columns.index('payout_ratio')

        pre_desc = transformer.get_description()

        # operating_leverage 
        self.assertLessEqual(pre_desc.at[loc1, 'min'], -757)
        self.assertGreaterEqual(pre_desc.at[loc1, 'max'], 535)   

        # payout_ratio 
        self.assertLessEqual(pre_desc.at[loc2, 'min'], -3.37)
        self.assertGreaterEqual(pre_desc.at[loc2, 'max'], 8.25)   
        
        tform = {'attr': ['operating_leverage', 'payout_ratio'], 'tType': 'OutlierRemoval'}
        transformer.apply_multi_transform(tform)

        desc = transformer.get_description()

        # operating_leverage 
        self.assertGreaterEqual(desc.at[loc1, 'min'], -4.8)
        self.assertLessEqual(desc.at[loc1, 'max'], 7.4)   

        # payout_ratio 
        self.assertGreaterEqual(desc.at[loc2, 'min'], -0.62)
        self.assertLessEqual(desc.at[loc2, 'max'], 1.2)    
        
    def test_apply_multi_imputation_transform(self):
        """ Test applying an imputation transform to multiple attributes. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc1 = data.columns.index('liquidity')
        loc2 = data.columns.index('operating_leverage')
        loc3 = data.columns.index('price/book')

        pre_desc =  transformer.get_description()
        self.assertTrue(pre_desc.at[loc1, 'hasMiss'])
        self.assertTrue(pre_desc.at[loc2, 'hasMiss'])
        self.assertTrue(pre_desc.at[loc3, 'hasMiss'])
        
        tform = {'attr': ['liquidity', 'operating_leverage', 'price/book'], 'tType': 'Missing', 'method': 'Mean', 'replaceVal': None}

        transformer.apply_multi_transform(tform)
        desc = transformer.get_description()

        self.assertFalse(desc.at[loc1, 'hasMiss'])
        self.assertFalse(desc.at[loc2, 'hasMiss'])
        self.assertFalse(desc.at[loc3, 'hasMiss'])

    def test_apply_multi_dropMissing_transform(self):
        """ Test applying a imputation transform to multiple attributes. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc1 = data.columns.index('smoking_status')
        loc2 = data.columns.index('bmi')
        

        pre_desc =  transformer.get_description()
        self.assertTrue(pre_desc.at[loc1, 'hasMiss'])
        self.assertTrue(pre_desc.at[loc2, 'hasMiss'])        
        
        tform = {'attr': ['smoking_status', 'bmi'], 'tType': 'Missing-Drop', 'method': 'Drop'}

        transformer.apply_multi_transform(tform)
        desc = transformer.get_description()

        self.assertFalse(desc.at[loc1, 'hasMiss'])
        self.assertFalse(desc.at[loc2, 'hasMiss'])

    def test_apply_multi_type_transform(self):
        """ Test applying a data type change transform to multiple attributes. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc1 = data.columns.index('smoking_status')
        loc2 = data.columns.index('bmi')
        

        pre_desc =  transformer.get_description()
        self.assertTrue(pre_desc.at[loc1, 'type'] == 'Nominal')
        self.assertTrue(pre_desc.at[loc2, 'type'] == 'Numerical')
        
        tform = {'attr': ['smoking_status', 'bmi'], 'tType': 'Dtype', 'new_type': 'Nominal'}

        transformer.apply_multi_transform(tform)
        desc = transformer.get_description()

        self.assertTrue(desc.at[loc1, 'type'] == 'Nominal')
        self.assertTrue(desc.at[loc2, 'type'] == 'Nominal')
        
    def test_apply_multi_ohe_transform(self):
        """ Test applying a one-hot encoding transform to multiple attributes. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
       
        tform = {'attr': ['gender', 'Residence_type'], 'tType': 'OHE', 'bind': None}

        transformer.apply_multi_transform(tform)
        desc = transformer.get_description()
        added = ['gender_Male', 'gender_Female', 'gender_Other', 'Residence_type_Rural', 'Residence_type_Urban']
        
        desc.set_index('name', inplace=True)
        self.assertEqual(desc.shape[0], 17)
        for c in added:
            self.assertTrue(c in desc.index.tolist())
            
        self.assertTrue(np.all(desc.loc[added, 'type'] == 'Nominal'))
        self.assertTrue(np.all(desc.loc[added, 'hasMiss'] == False))
        self.assertTrue(np.all(desc.loc[added, 'card'] == 2))

    def test_apply_multi_ohe_transform_with_bind(self):
        """ Test applying a one-hot encoding transform to multiple attributes. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
       
        tform = {'attr': ['gender', 'Residence_type'], 'tType': 'OHE', 'bind': 'age'}

        transformer.apply_multi_transform(tform)
        desc = transformer.get_description()
        added = ['gender_Male_age', 'gender_Female_age', 'gender_Other_age', 'Residence_type_Rural_age', 'Residence_type_Urban_age']
        
        desc.set_index('name', inplace=True)
        self.assertEqual(desc.shape[0], 17)
        for c in added:
            self.assertTrue(c in desc.index.tolist())
        
        # Test that age was bound and not 0 1 vals
        self.assertTrue(np.all(desc.loc[added, 'type'] == 'Numerical'))                
        self.assertTrue(np.all(desc.loc[added, 'max'] > 1)) 

    def test_apply_multi_norm_transform(self):
        """ Test applying a custom transform to multiple attributes. """        
        filepath = parentdir+"/data/sp500_data_rn.csv"

        data = Data(filepath)
        
        transformer = AKDataTransformer(data)
        loc1 = data.columns.index('eps')
        loc2 = data.columns.index('return')

        pre_desc = transformer.get_description()

        # eps 
        self.assertAlmostEqual(pre_desc.at[loc1, 'min'], -11.3, 1)
        self.assertAlmostEqual(pre_desc.at[loc1, 'max'], 49.5, 1)   

        # return 
        self.assertAlmostEqual(pre_desc.at[loc2, 'min'], -33.1, 1)
        self.assertAlmostEqual(pre_desc.at[loc2, 'max'], 17, 1)   
        
        tform = {'attr': ['eps', 'return'], 'tType': 'Custom', 'expr': '$var$ ** 2'}        
        transformer.apply_multi_transform(tform)

        desc = transformer.get_description()

        # eps 
        self.assertAlmostEqual(desc.at[loc1, 'min'], 0, 1)
        self.assertAlmostEqual(desc.at[loc1, 'max'], 2445.3, 1)        

        # return
        self.assertAlmostEqual(desc.at[loc2, 'min'], 0, 1)
        self.assertAlmostEqual(desc.at[loc2, 'max'], 1094, 1)

    def test_remove_transform(self):
        """ Test removing a transform"""
        filepath = parentdir+"/data/sp500_data_rn.csv"

        df = pd.read_csv(filepath)        
        data = Data(filepath)          
        transformer = AKDataTransformer(data)

        transform = {
            'attr': 'dividend',
            'tType': "Norm",
            'newmin': 0,
            'newmax': 10,
        }

        transformer.apply_transform(transform)
        desc = transformer.get_description()
        self.assertTrue("dividend" in desc.name.tolist())

        desc.set_index("name", inplace=True)
        
        norm = df["dividend"].copy()
        diff = transform['newmax'] - transform['newmin']
        norm = transform['newmin'] + (norm-norm.min())*diff/(norm.max() - norm.min())
        
        self.assertAlmostEqual(desc.at["dividend", "min"], np.min(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "25%"], np.percentile(norm, 25), 2)
        self.assertAlmostEqual(desc.at["dividend", "50%"], np.percentile(norm, 50), 2)
        self.assertAlmostEqual(desc.at["dividend", "75%"], np.percentile(norm, 75), 2)
        self.assertAlmostEqual(desc.at["dividend", "max"], np.max(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "mean"], np.mean(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "std"], np.std(norm), 2)

        trans_list = transformer.get_transformations()
        self.assertEqual(len(trans_list), 1)

        # unique ID for the transform 
        uid = trans_list[0]['uid']
        
        transformer.remove_transform(uid)
        
        desc = transformer.get_description()        
        self.assertTrue("dividend" in desc.name.tolist())
        desc.set_index("name", inplace=True)
        
        norm = df["dividend"]        
        self.assertAlmostEqual(desc.at["dividend", "min"], np.min(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "25%"], np.percentile(norm, 25), 2)
        self.assertAlmostEqual(desc.at["dividend", "50%"], np.percentile(norm, 50), 2)
        self.assertAlmostEqual(desc.at["dividend", "75%"], np.percentile(norm, 75), 2)
        self.assertAlmostEqual(desc.at["dividend", "max"], np.max(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "mean"], np.mean(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "std"], np.std(norm), 2)
        
        self.assertEqual(len(transformer.get_transformations()), 0)

    def test_toggle_transform(self):
        """ Test removing a transform"""
        filepath = parentdir+"/data/sp500_data_rn.csv"

        df = pd.read_csv(filepath)        
        data = Data(filepath)          
        transformer = AKDataTransformer(data)

        transform = {
            'attr': 'dividend',
            'tType': "Norm",
            'newmin': 0,
            'newmax': 10,
        }

        transformer.apply_transform(transform)
        desc = transformer.get_description()
        self.assertTrue("dividend" in desc.name.tolist())

        desc.set_index("name", inplace=True)
        
        norm = df["dividend"].copy()
        diff = transform['newmax'] - transform['newmin']
        norm = transform['newmin'] + (norm-norm.min())*diff/(norm.max() - norm.min())
        
        self.assertAlmostEqual(desc.at["dividend", "min"], np.min(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "25%"], np.percentile(norm, 25), 2)
        self.assertAlmostEqual(desc.at["dividend", "50%"], np.percentile(norm, 50), 2)
        self.assertAlmostEqual(desc.at["dividend", "75%"], np.percentile(norm, 75), 2)
        self.assertAlmostEqual(desc.at["dividend", "max"], np.max(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "mean"], np.mean(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "std"], np.std(norm), 2)

        trans_list = transformer.get_transformations()
        self.assertEqual(len(trans_list), 1)

        # unique ID for the transform 
        uid = trans_list[0]['uid']
        
        transformer.toggle_transform(uid)  # disable transform
        
        desc = transformer.get_description()        
        self.assertTrue("dividend" in desc.name.tolist())
        desc.set_index("name", inplace=True)
        
        norm = df["dividend"]        
        self.assertAlmostEqual(desc.at["dividend", "min"], np.min(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "25%"], np.percentile(norm, 25), 2)
        self.assertAlmostEqual(desc.at["dividend", "50%"], np.percentile(norm, 50), 2)
        self.assertAlmostEqual(desc.at["dividend", "75%"], np.percentile(norm, 75), 2)
        self.assertAlmostEqual(desc.at["dividend", "max"], np.max(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "mean"], np.mean(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "std"], np.std(norm), 2)
        
        self.assertEqual(len(transformer.get_transformations()), 1)

        transformer.toggle_transform(uid)  # re-enable
        desc = transformer.get_description()        
        self.assertTrue("dividend" in desc.name.tolist())
        desc.set_index("name", inplace=True)
        
        norm = df["dividend"].copy()
        diff = transform['newmax'] - transform['newmin']
        norm = transform['newmin'] + (norm-norm.min())*diff/(norm.max() - norm.min())
        
        self.assertAlmostEqual(desc.at["dividend", "min"], np.min(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "25%"], np.percentile(norm, 25), 2)
        self.assertAlmostEqual(desc.at["dividend", "50%"], np.percentile(norm, 50), 2)
        self.assertAlmostEqual(desc.at["dividend", "75%"], np.percentile(norm, 75), 2)
        self.assertAlmostEqual(desc.at["dividend", "max"], np.max(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "mean"], np.mean(norm), 2)
        self.assertAlmostEqual(desc.at["dividend", "std"], np.std(norm), 2)

    def test_get_transformed_data(self):
        """ Test applying get_transformed_data method """
        transform1 = {'tType': 'Derived', 'attr': 'derived', 'expr': 'col-1 + 3* col-2'}        
        transform2 = {'tType': 'Log', 'attr': 'derived', 'base': 10}
        transform3 = {'tType': 'ColNameChange', 'attr': 'derived', 'name': 'log-derived'}
        transform4 = {'tType': 'Filter', 'attr': 'log-derived', 'lb': 1}

        filepath = currentdir + '/test_data/test_data.csv'
        data = Data(filepath)

        transform_list = [transform1, transform2, transform3, transform4]

        deleted = ['col-0', 'derived', 'col-1']
        new_data = AKDataTransformer.get_transformed_data(data, transform_list, deleted)

        self.assertTrue("log-derived" in new_data.columns)
        self.assertFalse("col-0" in new_data.columns)
        self.assertFalse("derived" in new_data.columns)
        self.assertFalse("col-1" in new_data.columns)
        
        
if __name__ == '__main__':
    unittest.main()
