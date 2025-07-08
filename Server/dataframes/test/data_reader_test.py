import unittest
import os
import warnings
import sys
import inspect

import shutil

import pandas as pd
import numpy as np
import dask.dataframe as dd
import dask

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data_reader import DataReader, read_raw

class TestDataReader(unittest.TestCase):

    def test_init(self):
        """ Test the data reader. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        reader = DataReader(filepath)

        self.assertEqual(reader.line_count(), 374)
        self.assertTrue('symbol' in reader.columns())        
        sample = reader.sample(nsamples=100)
        
        self.assertTrue("symbol" in sample.columns)
        self.assertEqual(sample.shape[0], 100)

    def test_init_malformed(self):
        """ Test loading malformed data (i.e. too many columns). """
        filepath = parentdir+"/data/sp500_malformed.csv"
        
        reader = DataReader(filepath)

        self.assertEqual(reader.line_count(), 374)
        self.assertTrue('symbol' in reader.columns())        
        sample = reader.sample(nsamples=1000)
        
        self.assertTrue("symbol" in sample.columns)
        self.assertEqual(sample.shape[0], 373)

        encoding = 'utf_8'
        result = read_raw(filepath, encoding, nlines=100)
        self.assertEqual(len(result), 100)

        head = reader.head(nrows=500)
        self.assertEqual(head.shape[0], 373)
        
        
    def test_head(self):
        """ Test the data reader. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        reader = DataReader(filepath)

        self.assertEqual(reader.line_count(), 374)
        self.assertTrue('symbol' in reader.columns())        
        head = reader.head(nrows=100)
        
        self.assertTrue("symbol" in head.columns)
        self.assertEqual(head.shape[0], 100)

    def test_approx_line_count(self):
        """ Test approximating the line count. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        reader = DataReader(filepath)
        lc1 = reader.approx_line_count(10_000, nbatches=1)

        self.assertTrue(abs(lc1 - 374) < 50)

        lc2 = reader.approx_line_count(10_000_000, nbatches=1)
        self.assertEqual(lc2, 374)

        lc3 = reader.approx_line_count(10_000, nbatches=2)
        self.assertTrue(abs(lc3 - 374) < 50)
        
        
    def test_init_win(self):
        """ Test the data reader with windows file. """
        filepath = parentdir+"/data/sp500_stocks_win.csv"
        
        reader = DataReader(filepath)

        self.assertEqual(reader.line_count(), 374)
        self.assertTrue('symbol' in reader.columns())
        sample = reader.sample(nsamples=100)
        
        self.assertTrue("symbol" in sample.columns)
        self.assertTrue("p/cf" in sample.columns)
        self.assertEqual(sample.shape[0], 100)

        fullsample = reader.sample(nsamples=1000)
        self.assertTrue("p/cf" in fullsample.columns)
        
    def test_skip_line(self):
        """ Test skipping lines. """
        filepath = parentdir+"/data/sp500_data.csv"

        full = pd.read_csv(filepath)                
        options ={
            'encoding': None,
            'delim': ',',
            'lineDelim': None,    
            'headerRow': 0,        
            'startLine': 100,   
            'escapechar': None,
            'comment': None,
            'decimal': ".", 
            'thousands': None,
            'skipEmpty': True,
            'naOptions': [],
        }
        reader = DataReader(filepath, options)
        self.assertEqual(reader.line_count(), 274)        

        self.assertTrue('symbol' in reader.columns())
        sample = reader.sample(nsamples=100)
        
        self.assertTrue("symbol" in sample.columns)
        self.assertEqual(sample.shape[0], 100)

        # the first 100 rows should not be in the sample
        self.assertFalse(full.loc[50, 'symbol'] in sample['symbol'].tolist())
        self.assertFalse(full.loc[99, 'symbol'] in sample['symbol'].tolist())

        
    def test_non_zero_header(self):
        """ Test arbitrary header row. """
        filepath = parentdir+"/data/sp500_data.csv"

        options ={
            'encoding': None,
            'delim': ',',
            'lineDelim': None,    
            'headerRow': 1,        
            'startLine': 0,   
            'escapechar': None,
            'comment': None,
            'decimal': ".", 
            'thousands': None,
            'skipEmpty': True,
            'naOptions': [],
        }
        
        reader = DataReader(filepath, options=options)
        
        self.assertFalse('symbol' in reader.columns())
        self.assertTrue('JBHT' in reader.columns())
        
    def test_full_file(self):
        """ Test nsample > nrows """
        filepath = parentdir+"/data/sp500_data.csv"        
        reader = DataReader(filepath)
        sample = reader.sample(nsamples=1000)
        self.assertEqual(sample.shape[0], 374)

        
    def test_textFile(self):
        """ Test nsample > nrows """
        filepath = parentdir + "/data/test_data_txt/sp500_data_file_info_tab.txt"        
        reader = DataReader(filepath, options={
            'encoding': 'utf_8',
            'delim': '\t',
            'lineDelim': '\n',
            'headerRow': 3,
            'startLine': 0,
            'escapechar': '&',
            'comment': '#',
            'decimal': '.',
            'thousands': ',',
            'skipEmpty': True,
            'naOptions': [],
        })
        sample = reader.sample(nsamples=1000)
        self.assertEqual(sample.shape, (374, 27))
        
    def test_textFile_withOptions(self):
        """ Test nsample > nrows """
        filepath = parentdir + "/data/test_data_txt/sp500_data_test_multi.txt"     
        options ={
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "!",    
            'headerRow': 1,        
            'startLine': 2,   
            'escapechar': '&',
            'comment': '#',
            'decimal': "_", 
            'thousands': "-",
            'skipEmpty': False,
            'naOptions': [{'label': 'GS', 'value': 'GS'}],
        }         

        reader = DataReader(filepath, options=options)
        sample = reader.sample(nsamples=1000)
        self.assertEqual(sample.shape, (8, 4))

    def test_read_raw_1(self):
        """ Test read_raw method. """
        filepath = parentdir + "/data/sp500_data.csv"
        encoding = 'utf_8'

        result = read_raw(filepath, encoding, nlines=10)
        self.assertEqual(len(result), 10)

    def test_read_raw_2(self):
        """ Test read_raw method. """
        filepath = parentdir + "/data/test_data_txt/sp500_data_test_multi.txt"
        encoding = 'utf_8'
        line_delim = '!'

        result = read_raw(filepath, encoding, line_delim='!', nlines=20)
        self.assertEqual(len(result), 1)

        
if __name__ == '__main__':
    unittest.main()
    
