import unittest

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

from pathlib import Path
from store.data_store import DataStore

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestDataStore(unittest.TestCase):
    """ Test singleton data store. """
    def setUp(self):
        """ Create cache directory """
        os.mkdir('cache/')
        ds = DataStore.instance()
        ds.set_path('./cache')
        

    def tearDown(self):
        """ Remove the cache directory """
        # remove test files        
        shutil.rmtree('cache/')

    def test_store(self):
        """ Test storing data associated with ID. """

        ds = DataStore.instance()
        uid = ds.get_uid()
        
        self.assertEqual(ds.get_uid(), uid+1)
        self.assertFalse(ds.store_contains(uid))
        
        ds.store_data(uid, np.array([1,2,3]))
        self.assertTrue(ds.store_contains(uid))
        self.assertTrue(np.all(ds.get_data(uid)==np.array([1,2,3])))
        
        # test that store is empty after reset
        ds.reset_store()
        self.assertFalse(ds.store_contains(uid))

        # test that uid is 0 after reset
        self.assertEqual(ds.get_uid(), 0)

    def test_delete_data(self):
        """ Test storing data associated with ID. """

        ds = DataStore.instance()
        uid = ds.get_uid()
        
        self.assertEqual(ds.get_uid(), uid+1)
        self.assertFalse(ds.store_contains(uid))
        
        ds.store_data(uid, np.array([1,2,3]))
        self.assertTrue(ds.store_contains(uid))
        self.assertTrue(np.all(ds.get_data(uid)==np.array([1,2,3])))
        
        # test that store is empty after delete
        ds.delete_data(uid)
        self.assertFalse(ds.store_contains(uid))
                  
        

if __name__ == '__main__':
    unittest.main()
