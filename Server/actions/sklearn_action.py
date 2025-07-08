import sys, inspect
import os.path, pkgutil
import importlib

import numpy as np
import pandas as pd

import dask
import dask.dataframe as dd

import sklearn
import statsmodels
import statsmodels.api as sm
from sklearn.base import is_classifier, is_regressor
from sklearn.metrics import mean_squared_error, roc_auc_score, confusion_matrix
from dask_ml.model_selection import RandomizedSearchCV, GridSearchCV

from actions.results import ModelResult, FileResult
from dataframes.data import Data, DataInMem

from ak_logger import logger, log_it

def _is_regressor(model):
    """ True if model is regressor, False o.w. """
    if type(model) == statsmodels.regression.linear_model.RegressionResultsWrapper:
        return True

    return is_regressor(model)

def _is_classifier(model):
    """ True if model is classifier, False o.w. """
    if type(model) == statsmodels.discrete.discrete_model.BinaryResultsWrapper:
        return True
    
    return is_classifier(model)
    
def get_instance(module_name, class_name):
    """ Gets the class instance. 

    Args:
        module_name: Import path of the class.
        class_name: Class name of which to get the instance.
    
    Returns:
        The class instance.
    """
    module = importlib.import_module(module_name)
    return getattr(module, class_name)


def clean_param_val(value):
    """ Cleans the paramater value to return what sklearn expects. """
    if value == '':
        return None

    if not isinstance(value, str):
        return value
        
    if value in ['true', 'True']:
        return True

    if value in ['false', 'False']:
        return False

    if ',' in value:  # could be a list
        return [clean_param_val(v) for v in value.split(',')]
    
    try:            
        return int(value)  # convert to an int if possible
    except:
        try:
            return float(value)  # it might be a float
        except:
            return value  # it is a string

def regression_error_metrics(X, y, model):
    """ Computes useful error statistics for regressors. 
    
    Args:
        X: Predictor matrix.
        y: Target vector.
        model: Fitted model

    Returns:
        Dict. containing error statistics.
    """
    y_hat = model.predict(X)
    
    return {
        'R^2': model.score(X, y),
        'MSE': mean_squared_error(y, y_hat),
        'RMSE': mean_squared_error(y, y_hat, squared=False)
    }

def classification_error_metrics(X, y, model):
    """ Computes useful error statistics for classifiers. 
    
    Args:
        X: Predictor matrix.
        y: Target vector.
        model: Fitted model

    Returns:
        Dict. containing error statistics.
    """
    y_hat = model.predict_proba(X)
    
    return {
        'Accuracy': model.score(X, y),
        'AUC': (roc_auc_score(y, y_hat, multi_class='ovo') # multiclass case
                if len(y_hat.shape) == 1 or y_hat.shape[1] > 2 
                else roc_auc_score(y, y_hat[:,1])),  # binary case
        'confusion': confusion_matrix(y, model.predict(X)).tolist()
    }
        
def error_metrics(X, y, model):
    """ Computes useful error statistics. 
    
    Args:
        X: Predictor matrix.
        y: Target vector.
        model: Fitted model

    Returns:
        Dict. containing error statistics.
    """
    
    if _is_regressor(model):
        return regression_error_metrics(X, y, model)

    assert _is_classifier(model)  # sanity check
    return classification_error_metrics(X, y, model)


def sklearn_fit(sklearn_class, params, X, y):
    """ Fits an sklearn model 

    Args:
        sklearn_class: sklearn estimator.
        params: fit parameters.
        X: Matrix of predictors.
        y: Target vector.

    Returns:
        Fitted model.
    """
    model = sklearn_class(**params)    
    model.fit(X, y)
    return model


def statsmodels_fit(sm_class, X, y):
    """ Fits a statsmodels mmodel 

    Args:
        sm_class: statsmodels estimator.
        params: fit parameters.
        X: Matrix of predictors.
        y: Target vector.

    Returns:
        Fitted model.
    """
    if isinstance(X, dd.DataFrame):
        X = X.compute()
        y = y.compute()
        
    model = sm_class(y, sm.add_constant(X, has_constant='add'), missing='drop').fit()
    model.feature_names_in_ = X.columns
    
    model.raw_predict = model.predict
    model.predict = lambda X: model.raw_predict(sm.add_constant(X, has_constant='add'))

    if _is_regressor(model):
        model.score = lambda X, y: model.rsquared_adj
    else:
        def __predict_proba(X):
            """ Predict probabilities """
            if isinstance(X, dd.DataFrame):
                X = X.compute()

            return model.raw_predict(sm.add_constant(X, has_constant='add'))

        def __score(X, y):
            """ Returns accuracy score"""
            if isinstance(X, dd.DataFrame):
                X = X.compute()
                y = y.compute()

            return (model.predict(X) == y).mean()
        
        model.predict_proba = __predict_proba 
        model.predict = lambda X: (model.predict_proba(X) > 0.5).astype(int)
        model.score = __score 
        
    return model


def sklearn_fit_cv(sklearn_class, params, X, y, cv_method, cv, n_iter):
    """ Perform cross-validation on a specified sklearn model. 

    Args:
        sklearn_class: sklearn estimator.
        params: fit parameters.
        X: Matrix of predictors.
        y: Target vector.
        cv_method: cross-validation search method.
        cv: Number of CV folds.

    Returns:
        The best estimator.
    """
    if cv_method not in ['RandomizedSearchCV', 'GridSearchCV']:
        raise ValueError("cv_method must be either RandomizedSearchCV or GridSearchCV")

    estimator = sklearn_class()

    # create list from single parameter values
    params = {k: v if isinstance(v, list) else [v] for k, v in params.items()}

    if cv_method == 'RandomizedSearchCV':
        clf = RandomizedSearchCV(estimator, params, cv=cv, n_iter=n_iter, refit=True)
    else:
        clf = GridSearchCV(estimator, params, cv=cv, refit=True)
            
    clf.fit(X, y)

    return clf.best_estimator_
    
@log_it
def sklearn_fit_action(result, config):
    """ Fits a sklearn model based on config 

    Args:
        result: Result of previous action.
        config: Dict. containing name and file path info.
    
    Returns:
        The trained model.
    """
    data = result.data
    sample_options = config['options']
    target = config['target']
    predictors = config['predictors']

    is_cv_enabled = config['isCVEnabled']
    
    if sample_options['is_sample']:
        data = data.sample(sample_options['nsamples'])
    
    module = config['model']['module']
    classname = config['model']['label']

    params = {p['name']: clean_param_val(p['value']) for p in config['paramList']}
    sklearn_class = get_instance(module, classname)

    X = data[predictors]
    if target in predictors:
        X = X.drop([target], axis=1)
        
    y = data[target]

    summary = None
    if module == 'statsmodels.api':
        model = statsmodels_fit(sklearn_class, X, y)
        summary = str(model.summary())
        
    else:  # sklearn module
        if is_cv_enabled:
            model = sklearn_fit_cv(sklearn_class, params, X, y,
                                   config['cvMethod'], config['numCVFolds'],
                                   config['numIter'])
        else:
            model = sklearn_fit(sklearn_class, params, X, y)
        
    error = error_metrics(X, y, model)
        
    return ModelResult(model, target, error, data.shape, summary)


@log_it
def predict_action(model_result, file_result, config):
    """ Predicts based on a previously trained model. 

    Args:
        result: Result of previous action.
        config: Dict. containing name and file path info.
    
    Returns:
        The trained model.
    """
    data = file_result.data
    data = data[data.columns].reset_index(drop=True)

    is_in_mem = False
    if isinstance(data, pd.DataFrame):  # convert to dask
        data = dd.from_pandas(data, npartitions=1)
        is_in_mem = True
    
    include_residuals = config['includeResiduals']
    include_probability = config['includeProbability']
    missing_pred = config['missingPredictors']
    output_cols = config['outputColumns']
    
    target = model_result.target
    predict_name = f'{target}_pred' 
    residual_name = f'{target}_residual'
    
    if target not in data.columns:
        include_residuals = False
  
    if missing_pred:
        data = data.assign(**missing_pred)
        
    X = data[model_result.predictor_columns()]

    
    error = {}
    if target in data.columns:
        error = error_metrics(X, data[target], model_result.model)      
    
    
    yhat = dd.from_array(model_result.predict(X))

    yhat.name = predict_name
    pred_dataframe = yhat.to_frame()
    if include_residuals:
        y_res = dd.from_array(dask.compute(data[target])[0] - yhat.compute())
        y_res.name = residual_name
        pred_dataframe = pred_dataframe.merge(y_res.to_frame())

    if include_probability and is_classifier(model_result.model):
        proba_cols = [f'{target}_proba_class_{c}' for c in model_result.model.classes_]
        y_proba = dd.from_array(model_result.predict_proba(X), columns=proba_cols)
        pred_dataframe = pred_dataframe.merge(y_proba)

    if output_cols:
        pred_dataframe = data[output_cols].merge(pred_dataframe)
        

    if is_in_mem:
        pred_data = DataInMem(data=pred_dataframe.compute())

    else:
        pred_data = Data()
        pred_data._data = pred_dataframe.persist()

    # set the types for the predictors if necessary
    pred_data._types = {k: v for k, v in file_result.data.types.items() \
                        if k in pred_dataframe.columns}
    

    # set types for prediction
    if target in file_result.data.columns:
        pred_data._types[predict_name] = file_result.data.types[target]
    elif is_regressor(model_result.model):
        pred_data._types[predict_name] = 'Numeric'
    else:
        assert is_classifier(model_result.model)  # sanity check    
        if np.issubdtype(model_result.model.classes_.dtype, np.number):
            pred_data._types[predict_name] = 'Numeric'
        else:
            pred_data._types[predict_name] = 'Nominal'
            
    if include_residuals:
        pred_data._types[residual_name] = file_result.data.types[target]

    if target in output_cols:
        pred_data._types[target] = file_result.data.types[target]

    if include_probability and is_classifier(model_result.model):
        for c in model_result.model.classes_:
            pred_data._types[f'{target}_proba_class_{c}'] = 'Numerical'

    pred_data.load_to_dask()

    return FileResult('prediction', None, options=None,
                      data=pred_data, error=error,
                      model_name=model_result.model.__class__.__name__,
                      itemCount=pred_data.shape[0],
                      featureCount=pred_data.shape[1])
    
    

    
