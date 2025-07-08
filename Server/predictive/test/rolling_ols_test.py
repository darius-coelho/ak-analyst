import unittest
import os
import sys
import inspect

import shutil

import logging
import pandas as pd
import numpy as np

import statsmodels.api as sm

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data import Data
from predictive.rolling_ols import AKRollingOLS
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKRollingOLS(unittest.TestCase):
    """ Test rolling OLS action. """

    def tearDown(self):
        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')
        
    def test_fit_rolling_model(self):
        """ Test fit rolling model. """
        
        filepath = parentdir + "/data/bench.csv"
        ak_data = Data(filepath)
        target = "qyld_returns"
        predictors = ["return_ixic","return_gspc"]
        regressor = AKRollingOLS(ak_data, target=target, predictors=predictors)
        regressor.fit_rolling_model()
        #statsmodels.regression.linear_model.RegressionResultsWrapper

        self.assertTrue(isinstance(regressor.model, sm.regression.linear_model.RegressionResultsWrapper))        

        result = regressor.get_results()
        
        self.assertTrue(isinstance(result, Data))        
        self.assertEqual(ak_data.shape[1], 12)
        # ensure 3 new columns are added for the target, each predictor and the constant
        self.assertEqual(result.shape[1], 12 + 3 + 2*3 + 3) 
        self.assertTrue( target+'_pred' in result.columns )
        self.assertTrue( target+'_ci_lb' in result.columns )
        self.assertTrue( target+'_ci_ub' in result.columns )

        for p in predictors:
            self.assertTrue( p+'_coeff' in result.columns )
            self.assertTrue( p+'_ci_lb' in result.columns )
            self.assertTrue( p+'_ci_ub' in result.columns )


        self.assertTrue( 'const_coeff' in result.columns )
        self.assertTrue( 'const_ci_lb' in result.columns )
        self.assertTrue( 'const_ci_ub' in result.columns )
        
        
if __name__ == '__main__':
    unittest.main()
