import unittest


import pandas as pd
import numpy as np

import os
import sys
import inspect
import shutil
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
parentparentdir = os.path.dirname(os.path.dirname(parentdir))
sys.path.insert(0, parentdir) 

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
import statsmodels
import statsmodels.api as sm
from actions.results import FileResult, ModelResult
from actions.sklearn_action import sklearn_fit_action, clean_param_val, predict_action

from dataframes.data import Data

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestSKLearnAction(unittest.TestCase):
    """ Test sklearn action """
    def setUp(self):
        """ Create random data and store to a file. """
        np.random.seed(0)
        Xy = np.random.normal(size=(1000,3))

        data = pd.DataFrame(Xy, columns=['x1', 'x2', 'y'])
        
        data['y'] = 1.2 * data['x1'] + np.random.normal(1000)
        data['y'] = (data['y'] > data['y'].mean()).astype(float)
        
        os.mkdir(currentdir+'/test_data/')
        data.to_csv(currentdir+'/test_data/test_data.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files
        shutil.rmtree(currentdir+'/test_data/')
        
        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

    def test_clean_param_val(self):
        """ Test the clean_param_val helper function. """
        self.assertEqual(clean_param_val("0.001"), 0.001)
        self.assertEqual(clean_param_val(0.001), 0.001)

        self.assertEqual(clean_param_val("true"), True)
        self.assertEqual(clean_param_val("True"), True)
        self.assertEqual(clean_param_val(True), True)

        self.assertEqual(clean_param_val("false"), False)
        self.assertEqual(clean_param_val("False"), False)
        self.assertEqual(clean_param_val(False), False)

        self.assertEqual(clean_param_val(""), None)

        self.assertTrue(isinstance(clean_param_val("5"), int))
        self.assertTrue(isinstance(clean_param_val(5), int))
        self.assertEqual(clean_param_val("5"), 5)
        self.assertEqual(clean_param_val(5), 5)
                
        self.assertTrue(isinstance(clean_param_val("5.0"), float))
        self.assertTrue(isinstance(clean_param_val(5.0), float))
        self.assertEqual(clean_param_val("5.0"), 5.0)
        self.assertEqual(clean_param_val(5.0), 5.0)

    def test_sklearn_fit(self):
        """ Test fitting a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestRegressor',
                'label': 'RandomForestRegressor'
            },
            'paramList': [{'name': 'n_estimators', 'value': 100}],
	    'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        self.assertTrue(isinstance(result, ModelResult))
        self.assertTrue(isinstance(result.model, RandomForestRegressor))


    def test_sklearn_fit_cv(self):
        """ Test fitting a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestRegressor',
                'label': 'RandomForestRegressor'
            },
            'paramList': [
                {'name': 'n_estimators', 'value': '50,100,200'},
                {'name': 'max_depth', 'value': 2},
            ],
	    'isCVEnabled': True,
	    'cvMethod': "GridSearchCV",
	    'numCVFolds': 10,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        self.assertTrue(isinstance(result, ModelResult))
        self.assertTrue(isinstance(result.model, RandomForestRegressor))
    
    def test_sklearn_fit_class(self):
        """ Test fitting a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestClassifier',
                'label': 'RandomForestClassifier'
            },
            'paramList': [{'name': 'n_estimators', 'value': 100}],
            'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        self.assertTrue(isinstance(result, ModelResult))
        self.assertTrue(isinstance(result.model, RandomForestClassifier))

        
    def test_statsmodels_fit_class(self):
        """ Test fitting a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'statsmodels.api',
                'value': 'OLS',
                'label': 'OLS'
            },
            'paramList': [],
            'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        self.assertTrue(isinstance(result, ModelResult))
        self.assertTrue(
            isinstance(result.model, statsmodels.regression.linear_model.RegressionResultsWrapper)
        )

        
    def test_sklearn_fit_class_cv(self):
        """ Test fitting a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestClassifier',
                'label': 'RandomForestClassifier'
            },
            'paramList': [
                {'name': 'n_estimators', 'value': '50,100,150,200'},
                {'name': 'max_depth', 'value': '2,3,4,5'},
            ],
            'isCVEnabled': True,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
	    'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        self.assertTrue(isinstance(result, ModelResult))
        self.assertTrue(isinstance(result.model, RandomForestClassifier))
        

    def test_predict_action(self):
        """ Test predicting from a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestRegressor',
                'label': 'RandomForestRegressor'
            },
            'paramList': [{'name': 'n_estimators', 'value': 100}],
            'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)

        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x1', 'x2', 'y']
        }
        
        pred_result = predict_action(result, data_file, pred_config)
        self.assertTrue(isinstance(pred_result, FileResult))
        self.assertListEqual(pred_result.data.columns, ['x1','x2', 'y', 'y_pred', 'y_residual'])
        
        pred_config = {
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x1', 'x2']
        }        
        pred_result = predict_action(result, data_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1','x2', 'y_pred', 'y_residual'])

        pred_config = {
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x2']
        }        
        pred_result = predict_action(result, data_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x2', 'y_pred', 'y_residual'])

        pred_config = {
            'includeResiduals': False,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x1', 'x2']
        }        
        pred_result = predict_action(result, data_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1','x2', 'y_pred'])

        pred_config = {
            'includeResiduals': False,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': []
        }        
        pred_result = predict_action(result, data_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['y_pred'])

        
        pred_config = {
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': []
        }        
        pred_result = predict_action(result, data_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['y_pred', 'y_residual'])
        self.assertTrue('error' in pred_result.response()['outputList'][0])
        self.assertNotEqual(pred_result.response()['outputList'][0]['error'], {})

    def test_predict_action_missing_target(self):
        """ Test predicting from a model with missing target. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        test_data = Data(filepath)

        test_data.drop_column('y')
        
        data_file = FileResult('data', None, data=ak_data)
        test_file = FileResult('test', None, data=test_data)
        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestRegressor',
                'label': 'RandomForestRegressor'
            },
            'paramList': [{'name': 'n_estimators', 'value': 100}],
            'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        
        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x1', 'x2']
        }

        
        pred_result = predict_action(result, test_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1','x2', 'y_pred'])

        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x1']
        }

        
        pred_result = predict_action(result, test_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1', 'y_pred'])

        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': False,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': ['x1', 'x2']
        }
        
        pred_result = predict_action(result, test_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1','x2', 'y_pred'])

        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': False,
            'includeProbability': False,
            'missingPredictors': {},
            'outputColumns': []
        }
        
        pred_result = predict_action(result, test_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['y_pred'])

        
    def test_predict_action_class(self):
        """ Test predicting from a model. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestClassifier',
                'label': 'RandomForestClassifier'
            },
            'paramList': [{'name': 'n_estimators', 'value': 100}],
            'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)

        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': True,
            'includeProbability': True,
            'missingPredictors': {},
            'outputColumns': ['x1', 'x2', 'y']
        }

        pred_result = predict_action(result, data_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1', 'x2', 'y', 'y_pred',
                                                        'y_residual', 'y_proba_class_0.0',
                                                        'y_proba_class_1.0'])


    def test_predict_action_missing_columns(self):
        """ Test predicting from a model with missing column. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        test_data = Data(filepath)

        test_data.drop_column('x2')
        test_data.drop_column('y')
        
        data_file = FileResult('data', None, data=ak_data)
        test_file = FileResult('test', None, data=test_data)
        config = {
            'target': 'y',
            'predictors': ['x1', 'x2'],
            'model': {
                'module': 'sklearn.ensemble',
                'value': 'RandomForestRegressor',
                'label': 'RandomForestRegressor'
            },
            'paramList': [{'name': 'n_estimators', 'value': 100}],
            'isCVEnabled': False,
	    'cvMethod': "RandomizedSearchCV",
	    'numCVFolds': 5,
            'numIter': 5,
            'options': {'is_sample': False}
        }

        result = sklearn_fit_action(data_file, config)
        
        pred_config = {
            'options': {'is_sample': False},
            'includeResiduals': True,
            'includeProbability': False,
            'missingPredictors': {'x2': 0},
            'outputColumns': ['x1', 'x2']
        }

        
        pred_result = predict_action(result, test_file, pred_config)
        self.assertListEqual(pred_result.data.columns, ['x1', 'y_pred'])


        
if __name__ == '__main__':
    unittest.main()


