from unittest import result
import numpy as np
import pandas as pd

import statsmodels.api as sm
from dataframes.data import Data
import dask.dataframe as dd

from ak_logger import logger, log_it

class AKRollingOLS:
    """ Managed transformations and gathers data necessary 
    for front-end visualization. """

    @log_it
    def __init__(self, data, target, predictors, window=60, ci=95, featureSel=False):
        """ Constructor fot AKDataTransformer class 

        Args:
            data: The dataset user to create the model.
            target: The attribute the model will predict
            predictors: The attributes the model will us to predict the target
        """
        self.data = data
        if isinstance(data, Data):
            self.data = data.to_pandas()        
        self.target = target
        self.window = int(window)
        self.predictors = predictors
        self.alpha = (100-int(ci)) / 100
        self.featureSel = featureSel

    @log_it
    def __fit(self, y, X, featureSel=False):
        """ Fit a linear regression model. """    
        self.drop = []

        model = sm.OLS(y, sm.add_constant(X.drop(self.drop, axis=1))).fit(disp=0)

        if featureSel:
            # Use p-value feature selection    
            while X.shape[1] > 0:                            
                model = sm.OLS(y, sm.add_constant(X.drop(self.drop, axis=1))).fit(disp=0)
                pvalues = model.pvalues.drop(['const'])            

                remove = pvalues.idxmax()  # x with max p-value
                pval = pvalues[remove]

                if pval < self.alpha:
                    break

                self.drop.append(remove)
                        
        self.model = model
    
    @log_it
    def __predict(self, X):
        """ Predicts returns based on fitted model (static) """
        prediction = self.model.get_prediction(sm.add_constant(X.drop(self.drop, axis=1), has_constant='add'))
        frame = prediction.summary_frame(alpha=self.alpha)
        return frame['mean'], frame.obs_ci_lower, frame.obs_ci_upper

    @log_it
    def fit_rolling_model(self):        
        """ Creates the rolling linear regression model. 

        """        
        
        X = self.data[self.predictors] 
        targetParams =  [ '{}_pred'.format(self.target), 
                        '{}_ci_lb'.format(self.target),
                        '{}_ci_ub'.format(self.target)]

        newCols = [ '{}_coeff'.format(x) for x in X.columns] \
                    + [ '{}_ci_lb'.format(x) for x in X.columns] \
                    + [ '{}_ci_ub'.format(x) for x in X.columns] \
                    + targetParams
        
        results = pd.DataFrame(columns=newCols, index=X.index)
        results['const_coeff'] = np.nan
        results['const_ci_lb'] = np.nan
        results['const_ci_ub'] = np.nan

        coeffs = pd.DataFrame(columns=X.columns, index=X.index)
        coeffs['const'] = np.nan
        

        Y = self.data[self.target]        

        N = X.shape[0]
        
        for i in range(self.window, N):            
            start, end = i-self.window, i
            Xtrain = X[start:end]
            Ytrain = Y[start:end]            
            # fit the model            
            self.__fit(Ytrain, Xtrain, self.featureSel)
            params = self.model.params.index  # list of non-zero beta coeffs            
            pframe = self.model.params.to_frame().T  # convert to dataframe     
            

            if end==self.window:  # first ndays
                # init coeffs for first training period
                tmp = pframe.loc[pframe.index.repeat(Xtrain.shape[0])].set_index(Xtrain.index)   
                print()   
                newParams = [ '{}_coeff'.format(x) for x in params ]
                tmp.columns = newParams                
                results.loc[Xtrain.index, newParams] = tmp                

                ci = self.model.conf_int()                
                for idx, row in ci.iterrows():
                    results.loc[Xtrain.index, '{}_ci_lb'.format(idx)] = row[0]
                    results.loc[Xtrain.index, '{}_ci_ub'.format(idx)] = row[1] 

                Xtest = X[:i+1]                         
                y_pred_i, y_lci_i, y_uci_i = self.__predict(Xtest)
                results.loc[Xtrain.index, targetParams[0]] = y_pred_i
                results.loc[Xtrain.index, targetParams[1]] = y_lci_i
                results.loc[Xtrain.index, targetParams[2]] = y_uci_i
            else:
                # set coeffs for most recent period       
                tmp = self.model.params.to_frame().T.set_index(Xtrain.tail(1).index)   
                newParams = [ '{}_coeff'.format(x) for x in params ]
                tmp.columns = newParams
                results.loc[Xtrain.tail(1).index, newParams] = tmp

                # confidence interval for predictors for most recent period 
                ci = self.model.conf_int()
                for idx, row in ci.iterrows():
                    results.loc[Xtrain.tail(1).index, '{}_ci_lb'.format(idx)] = row[0]
                    results.loc[Xtrain.tail(1).index, '{}_ci_ub'.format(idx)] = row[1]                    

                # predictons for next period                           
                Xtest = X[i:i+1]  # predict the next day                        
                y_pred_i, y_lci_i, y_uci_i = self.__predict(Xtest)
                results.loc[Xtrain.tail(1).index, targetParams[0]] = y_pred_i.iloc[0]
                results.loc[Xtrain.tail(1).index, targetParams[1]] = y_lci_i.iloc[0]
                results.loc[Xtrain.tail(1).index, targetParams[2]] = y_uci_i.iloc[0]
        
        self.results = results.fillna(0)
                  
        
    @log_it
    def get_results(self):
        """ Generates a table with the results of the rolling OLS

        """  
        
        # append results to original data and return.
        result = Data()        
        result._data = dd.from_pandas(self.data.join(self.results), chunksize=1000)
        result.load_to_dask()

        return result


        