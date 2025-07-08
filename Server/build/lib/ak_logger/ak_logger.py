import os
import sys
import logging
import logging.config
import traceback

from inspect import getframeinfo, stack, getfile, currentframe
from functools import wraps

currentdir = os.path.dirname(os.path.abspath(getfile(currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
directory = parentdir+'/ak_logs'

class CustomFormatter(logging.Formatter):
    """ Custom Formatter does these 2 things:
    1. Overrides 'funcName' with the value of 'func_name_override', if it exists.
    2. Overrides 'filename' with the value of 'file_name_override', if it exists.
    """
    def format(self, record):
        if hasattr(record, 'func_name_override'):
            record.funcName = record.func_name_override
        if hasattr(record, 'file_name_override'):
            record.filename = record.file_name_override
        return super(CustomFormatter, self).format(record)

    
DEFAULT_LOGGING = {
    'version': 1,
    'formatters': {
        'CustomFormatter': {
            '()':  CustomFormatter,
            'format': '%(asctime)s - %(levelname)-10s - %(filename)s - %(funcName)s - %(message)s',
            'datefmt': '%Y-%m-%d - %H:%M:%S'
        },
        'standard': {            
            'format': '%(asctime)s - %(filename)s - %(funcName)s - %(levelname)s: %(message)s',
            'datefmt': '%Y-%m-%d - %H:%M:%S' },
    },
    'handlers': {
        'console':  {'class': 'logging.StreamHandler', 
                     'formatter': "CustomFormatter", 
                     'level': 'DEBUG', 
                     'stream': sys.stdout},
        'file':     {'class': 'logging.handlers.RotatingFileHandler', 
                     'formatter': 'CustomFormatter', 
                     'level': 'DEBUG', 
                     'filename': directory+'/ak_analyst.log',
                     "maxBytes": 10485760,
                     "backupCount": 20} 
    },
    'loggers': { 
        __name__:   {'level': 'DEBUG', 
                     'handlers': ['console', 'file'], 
                     'propagate': False },
    }
}


def limit_string_len(s, limit=30):
    """ Returns a substring of s to limit the string length. """
    if len(s) > limit:
        return s[:limit] + '...'
    
    return s
    
def log_it(func):
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        """ Wrapper which adds basic logging to the decorated function. """

        # get the wrapped function and file name
        py_file_caller = getframeinfo(stack()[1][0])
        extra_args = { 'func_name_override': func.__name__,
                       'file_name_override': os.path.basename(py_file_caller.filename) }


        # parse the arguments
        args_passed_in_function = [repr(a) for a in args]
        kwargs_passed_in_function = [f"{k}={v!r}" for k, v in kwargs.items()]
        formatted_arguments = ", ".join(args_passed_in_function + kwargs_passed_in_function)

        formatted_arguments = limit_string_len(formatted_arguments)
        
        logger.info(f"Arguments: {formatted_arguments} - Begin function", extra=extra_args)
        try:
            result = func(*args, **kwargs)
            log_result = limit_string_len(repr(result))
            logger.info(f"Returned: - End function {log_result}", extra=extra_args)
        except:
            # report exception and raise
            logger.error(f"Exception: {traceback.format_exc()}", extra=extra_args)
            raise
        
        return result
    
    return wrapper



# create logging directory
if not os.path.exists(directory):
    os.makedirs(directory)
    
logging.config.dictConfig(DEFAULT_LOGGING)
logger = logging.getLogger(__name__)
