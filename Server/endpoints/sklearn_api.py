# -----------------------------------------------------------
# Contains API end-points that deals with 
# sklearn actions
# -----------------------------------------------------------
import sys, inspect
import os.path, pkgutil
import importlib

import sklearn
from sklearn.base import is_classifier, is_regressor

from flask import request, session, Blueprint
from flask_cors import  cross_origin

from ak_logger import logger, log_it

sklearn_api = Blueprint("sklearn_api", __name__)

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

def get_params(instance):
    """ Gets the configuration params and default values 
    for the class instance. 

    Args: 
        instance: Class instance to get the params for.
    
    Returns:
        List containing each param name and default value as dict..
    """
    signature = inspect.signature(instance.__init__)
    return [{'name': p.name, 'value': '' if p.default is None else p.default} \
            for p in signature.parameters.values() if p.name not in ['self', 'kwargs']]
    
    
    
@sklearn_api.route('/ModelList', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def model_list():
    """ Gets the list of sklearn models. """
    
    pkgpath = os.path.dirname(sklearn.__file__)

    # list of relevant sklearn modules
    modules = [name for _, name, _ in pkgutil.iter_modules([pkgpath]) \
               if name[0] != '_' and 'test' not in name]



    # exclude models that are not suitable (e.g. take another model as input).
    exclude_models = [
        'OneVsOneClassifier',
        'OneVsRestClassifier',
        'StackingClassifier',
        'StackingRegressor',
        'VotingClassifier',
        'VotingRegressor',
        'RANSACRegressor',
        'OutputCodeClassifier',
        'ClassifierChain',
        'MultiOutputRegressor',
        'MultiOutputClassifier',
        'RegressorChain',
        'SelfTrainingClassifier'
    ]
    
    def is_sklearn_model(element):
        """ Returns True if element is an sklearn model. False o.w. """
        return inspect.isclass(element) \
            and hasattr(element, 'predict') \
            and (is_classifier(element) or is_regressor(element)) \
            and element.__name__[0] != '_' \
            and element.__name__[:4] != 'Base' \
            and 'Mixin' not in element.__name__ \
            and element.__name__ not in exclude_models
                                        
        
    model_classes = []
    for mod in modules:
        importlib.import_module(f'sklearn.{mod}')
        clsmembers = inspect.getmembers(getattr(sklearn, mod), is_sklearn_model)
        model_classes = model_classes + clsmembers

    model_list =  {'models': [{'label': m[0], 'value': m[0], 'module': m[1].__module__} \
                              for m in model_classes] + \
                   [{'label': "OLS", 'value': "OLS", 'module': 'statsmodels.api'},
                    {'label': "Logit", 'value': "Logit", 'module': 'statsmodels.api'}]}
    return model_list
    


@sklearn_api.route('/ModelOptions', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def model_options():
    """ Gets the list of options available for a selected model. """
    selected_model = request.get_json()    
    module = selected_model['module']
    classname = selected_model['label']

    if module == 'statsmodels.api' or classname == 'Auto':
        return {'options': []}
    
    # gets the class instance (e.g. RandomForestClassifier)
    instance = get_instance(module, classname)
        
    result = {'options': get_params(instance)}
    return result
