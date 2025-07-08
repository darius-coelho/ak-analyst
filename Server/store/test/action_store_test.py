import unittest

import numpy as np
import networkx as nx

import os
import sys
import inspect
import shutil

import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
parentparentdir = os.path.dirname(os.path.dirname(parentdir))
sys.path.insert(0, parentdir) 


from store.action_store import (is_in_cache, read_from_cache, store_to_cache,
                                does_action_cache_graph_exist, get_action_cache_graph,
                                create_action_cache_graph)
from store.data_store import DataStore
from actions.results import FileResult

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestActionStore(unittest.TestCase):
    """ Test action store methods. """

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

        atype = 'LOAD'
        pred_ids = []
        pred_ports = ["NA"]
        config = {'name': 'sp500_data.csv', 'path': parentdir + '/data/sp500_data.csv'}
        self.assertFalse(is_in_cache(uid, pred_ids, pred_ports, atype, config))

        result = FileResult(config['name'], config['path'])
        store_to_cache(result, uid, pred_ids, pred_ports, atype, config)
        self.assertTrue(is_in_cache(uid, pred_ids, pred_ports, atype, config))

        result_cache = read_from_cache(uid, pred_ids, pred_ports, atype, config)
        self.assertEqual(result_cache.name, config['name'])
        self.assertEqual(result_cache.path, config['path'])

        
    def test_action_cache_graph(self):
        """ Test storing the action cache graph. """
        ds = DataStore.instance()
        uid = ds.get_uid()               

        G = create_action_cache_graph(uid)

        self.assertTrue(nx.is_empty(G))
        G.add_node(1, stale=False)
        G.add_node(2, stale=True)
        G.add_edge(1,2)
        self.assertFalse(nx.is_empty(G))
        
        self.assertTrue(does_action_cache_graph_exist(uid))
        G2 = get_action_cache_graph(uid)
        self.assertFalse(nx.is_empty(G2))
        self.assertTrue(G2.has_node(2))
        
        

if __name__ == '__main__':
    unittest.main()
