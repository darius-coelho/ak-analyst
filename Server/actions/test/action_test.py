import unittest

import os
import sys
import inspect
import shutil
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

from werkzeug.datastructures import FileStorage

import pandas as pd
import numpy as np

from actions.action import Action
from actions.results import FPResult
from store.data_store import DataStore

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAction(unittest.TestCase):
    """ Test generic action methods. """
    
    def setUp(self):
        """ Create cache directory """
        os.mkdir('cache/')
        ds = DataStore.instance()
        ds.set_path('./cache')
        

    def tearDown(self):
        """ Remove the cache directory """
        # remove test files        
        shutil.rmtree('cache/')
        
    def test_execute_join(self):
        """ Test executing actions with dependencies. """
        filepath = parentdir + "/data/sp500_data.csv"
        file_info1 = {
            'name': 'sp500_data.csv',
            'path': filepath,
            'inMemory': True,
            'options': None,
            'type': 'text/csv'
        }

        file_info2 = {
            'name': 'sp500_data.csv',
            'path': filepath,
            'inMemory': True,
            'options': None,
            'type': 'text/csv'
        }
        
        data = {
            'ID': 3,
            'type': 'JOIN',
            'config': {
                'how': 'inner',
                'join': [['symbol', 'symbol']],
                'suffix': ['_x', '_y']
            },
            'input': [
                {'ID': 1, 'outPort': 0, 'type': 'LOAD_FILE', 'config': file_info1, 'input': []},
                {'ID': 2, 'outPort': 0, 'type': 'LOAD_FILE', 'config': file_info2, 'input': []},
            ]
        }

        def send_message(nodeId, action_type, is_loading):
            return 1
        def send_result(ID, type, result):
            return 2

        uid = 0
        action = Action(uid, send_message, send_result)
        result, _ = action.execute(data['ID'], data['type'], data['config'], data['input'], None)
        self.assertTrue('symbol' in result.data.columns)
        self.assertTrue('asset_turnover_x' in result.data.columns)
        self.assertTrue('asset_turnover_y' in result.data.columns)

        self.assertTrue(action.action_cache_graph.has_node(1))
        self.assertTrue(action.action_cache_graph.has_node(2))
        self.assertTrue(action.action_cache_graph.has_node(3))

        self.assertTrue(action.action_cache_graph.has_edge(1,3))
        self.assertTrue(action.action_cache_graph.has_edge(2,3))
        self.assertFalse(action.action_cache_graph.has_edge(1,2))

    def test_execute_join_from_split(self):
        """ Test executing actions with input from same action with different ports. """
        filepath = parentdir + "/data/sp500_data.csv"
        file_info = {
            'name': 'sp500_data.csv',
            'path': filepath,
            'inMemory': True,
            'options': None,
            'type': 'text/csv'
        }
        data = {
            'ID': 2,
            'type': 'JOIN',
            'config': {
                'how': 'left',
                'join': [['symbol', 'symbol']],
                'suffix': ['_x', '_y']
            },
            'input': [
                {
                    'ID': 1,
                    'type': 'SPLITDATA',
                    'config': {'sizeType': 'Absolute Count', 'sizeValue': 30, 'method': 'InOrder'},
                    'input': [{'ID': 0, 'type': 'LOAD_FILE', 'config': file_info, 'outPort': 0, 'input': []}],
                    'isReady': True,
                    'outPort': 0
                },
                {
                    'ID': 1,
                    'type': 'SPLITDATA',
                    'config': {'sizeType': 'Absolute Count', 'sizeValue': 30, 'method': 'InOrder'},
                    'input': [{'ID': 0, 'type': 'LOAD_FILE', 'config': file_info, 'outPort': 0, 'input': []}],
                    'isReady': True,
                    'outPort': 1
                }
            ]
        }

        def send_message(nodeId, action_type, is_loading):
            return 1
        def send_result(ID, type, result):
            return 2

        uid = 0
        action = Action(uid, send_message, send_result)
        result, _ = action.execute(data['ID'], data['type'], data['config'], data['input'], None)
        self.assertTrue('symbol' in result.data.columns)
        self.assertTrue('asset_turnover_x' in result.data.columns)
        self.assertTrue('asset_turnover_y' in result.data.columns)

        self.assertTrue(action.action_cache_graph.has_node(0))
        self.assertTrue(action.action_cache_graph.has_node(1))
        self.assertTrue(action.action_cache_graph.has_node(2))

        self.assertTrue(action.action_cache_graph.has_edge(0,1))
        self.assertTrue(action.action_cache_graph.has_edge(1,2))        
        
    def test_execute_mine_fp(self):
        """ Test executing actions with dependencies. """
        filepath = parentdir + "/data/sp500_data.csv"
        file_info1 = {
            'name': 'sp500_data.csv',
            'path': filepath,
            'inMemory': True,
            'options': None,
            'type': 'text/csv'
        }

        file_info2 = {
            'name': 'sp500_data.csv',
            'path': filepath,
            'inMemory': False,
            'options': None,
            'type': 'text/csv'
        }
        
        data = {
            'ID': 4,
            'type': 'AK_MINE',
            'config': {
                'target': ['fut_return'],
                'method': 'fpminer',
                'mineType': 'numeric',
                'options': {'is_sample': True, 'nsamples': 200}
            },
            'input': [
                {
                    'ID': 3, 
                    'type': 'JOIN', 
                    'config':{
                        'how': 'inner', 
                        'join': [
                            ['symbol', 'symbol'],
                            ['fut_return', 'fut_return']
                        ], 
                        'suffix': ['_x', '_y']
                    },
                    'input': [
                        {'ID': 1, 'outPort': 0, 'type': 'LOAD_FILE', 'config': file_info1, 'input': []},
                        {'ID': 2, 'outPort': 0, 'type': 'LOAD_FILE', 'config': file_info2, 'input': []},
                    ],
                    'outPort': 0
                }
            ]            
        }

        def send_message(nodeId, action_type, is_loading):
            return 1
        def send_result(ID, type, result):
            return 2

        uid = 1
        action = Action(uid, send_message, send_result)
        result, is_from_cache = action.execute(data['ID'], data['type'],
                                               data['config'], data['input'], None)
        self.assertFalse(is_from_cache)
        self.assertTrue(isinstance(result, FPResult))

        store = DataStore.instance()
        result, is_from_cache = action.execute(data['ID'], data['type'],
                                               data['config'], data['input'], None)
        
        self.assertTrue(is_from_cache)
        self.assertTrue(isinstance(result, FPResult))

        self.assertTrue(action.action_cache_graph.has_node(1))
        self.assertTrue(action.action_cache_graph.has_node(2))
        self.assertTrue(action.action_cache_graph.has_node(3))
        self.assertTrue(action.action_cache_graph.has_node(4))
        
        self.assertTrue(action.action_cache_graph.has_edge(1,3))
        self.assertTrue(action.action_cache_graph.has_edge(2,3))
        self.assertTrue(action.action_cache_graph.has_edge(3,4))
        self.assertFalse(action.action_cache_graph.has_edge(1,2))

        for nid in action.action_cache_graph.nodes():
            self.assertTrue(action.is_cache_fresh(nid))

        # test changing config and running again
        file_info2['name'] = 'sp500_data2.csv'
        
        result, is_from_cache = action.execute(2, 'LOAD_FILE', file_info2, [], None)

        self.assertTrue(action.is_cache_fresh(1))
        self.assertTrue(action.is_cache_fresh(2))

        # descendant actions should be stale
        self.assertFalse(action.is_cache_fresh(3))
        self.assertFalse(action.is_cache_fresh(4))        

        
        
if __name__ == '__main__':
    unittest.main()

