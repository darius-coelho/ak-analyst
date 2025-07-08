import unittest

import os
import sys
import inspect

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

def run_test_suite(start_dir):
    """ Runs all python unittests in the start_dir. 

    Args:
        start_dir: Test directory containing unittests.
    """
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir, pattern="*_test.py")
    
    runner = unittest.TextTestRunner()
    runner.run(suite)

def run_action_tests():
    """ Run all action unittests """
    run_test_suite(parentdir + '/Server/actions/test/')

def run_dataframe_tests():
    """ Run all dataframe unittests """
    run_test_suite(parentdir + '/Server/dataframes/test/')

def run_transformer_tests():
    """ Run all transformer unittests """
    run_test_suite(parentdir + '/Server/transformer/test/')

def run_predictive_tests():
    """ Run all predictive unittests """
    run_test_suite(parentdir + '/Server/predictive/test/')

def run_store_tests():
    """ Run all store unittests """
    run_test_suite(parentdir + '/Server/store/test/')

def run_plotting_tests():
    """ Run all plotting unittests """
    run_test_suite(parentdir + '/Server/plotting/test/')

def run_analyst_tests():
    """ Run all tests in the analyst directory. """
    run_test_suite(parentdir + '/Server/analyst/test/')

def run_causal_tests():
    """ Run all tests in the causal directory. """
    run_test_suite(parentdir + '/Server/causal/test/')

def run_file_tests():
    """ Run all tests in the file directory. """
    run_test_suite(parentdir + '/Server/file/test/')

def run_all_tests():
    """ Runs all unittests.  """
    print("*************************Running File Tests*************************")
    run_file_tests()

    print("*************************Running Analyst Tests*************************")
    run_analyst_tests()
    
    print("*************************Running Causal Tests*************************")
    run_causal_tests()
    
    print("*************************Running Action Tests*************************")
    run_action_tests()

    print("*************************Running Dataframe Tests*************************")
    run_dataframe_tests()

    print("*************************Running Transformer Tests*************************")
    run_transformer_tests()

    print("*************************Running Predictive Tests*************************")        
    run_predictive_tests()
    
    print("*************************Running Store Tests*************************")        
    run_store_tests()

    print("*************************Running Plotting Tests*************************")        
    run_plotting_tests()
    
    
if __name__ == '__main__':
    run_all_tests()
    
