import unittest
import os
import sys
import inspect
import shutil

import logging
import pandas as pd
import numpy as np
import json

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from plotting.plot import plot_data, plot_box_plot, get_nice_division
from dataframes.data import Data, DataInMem
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestPlot(unittest.TestCase):
    """ Test plot methods. """

    def setUp(self):
        """ Create random data and store to a file. """        
        N, M = 1000, 100
        columns = [f'col-{i}'for i in range(M)]
        X = np.random.normal(size=(N, M))
        X[:, 2] = X[:, 1] + np.random.normal(size=N)

        level_count = int(N/4)        

        df = pd.DataFrame(X, columns=columns)
        df['col-0'] = ['a'] * level_count \
                      + ['b'] * level_count \
                      + ['c'] * level_count \
                      + ['d'] * level_count
        df['col-96'] = ['e'] * int(N - int(N/3)) + ['f'] * int(N/3)
        df['col-97'] = ['e'] * int(N - int(N/3)) + ['f'] * int(N/3)
        df['col-98'] = ['u'] * int(N / 3) + ['v'] * int(N - int(N/3))
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        df['col-10'] = pd.date_range(start='01/01/1988', periods=N)
        
        df.loc[0, 'col-3'] = np.inf  # set an inf

        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)
        df['col-1'] = np.nan
        df['col-33'] = np.nan
        df.loc[2, 'col-33'] = 0.1
        
        df.to_csv('test_data/test_data_nan.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files        
        shutil.rmtree('test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

    def test_box_plot(self):
        """ Test getting a box plot data. """
        X = np.random.normal(size=(10000, 3))
        X[:, 1] = [0] * 5000 + [1] * 5000
        bigdata = pd.DataFrame(X, columns=['x1', 'x2', 'x3'])

        biginfo = plot_box_plot(bigdata[['x2', 'x1']])

        self.assertTrue(np.all(biginfo.columns==['label','min','max','median',
                                                 'mean', 'q1','q3']))
        self.assertEqual(biginfo.shape[0], 2)

    def test_scatter_plot(self):
        """ Test getting data for a scatter plot. """

        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        data_mem = DataInMem(filepath)
        data_sample = data.sample()

        target = 'col-1'
        attribute = 'col-2'
        filters = [
            {'attr': 'col-2', 'type': 'In', 'isCat': False, 'range': ['0.01', 'inf']},            
        ]

        plot='Scatterplot'
        targetType='numeric'
        
        for d in [data, data_mem, data_sample]:
            result = plot_data(d, target, attribute, filters=filters, plot=plot, targetType=targetType)

            self.assertTrue(np.all(list(result.keys())==['inData', 'outData', 'inExtent', 'outExtent']))     
            
            inData = json.loads(result['inData'])
            outData = json.loads(result['outData'])
            self.assertTrue(len(inData) > 0 and len(inData) < data.shape[0])
            self.assertTrue(len(outData) > 0 and len(outData) < data.shape[0])

            inExtent = result['inExtent']
            outExtent = result['outExtent']

            # Check filters were applied
            self.assertTrue(inExtent['x'][0] > 0)
            self.assertTrue(inExtent['x'][1] > 0 and inExtent['x'][1] > inExtent['x'][0])
            self.assertTrue(outExtent['x'][0] < 0)
            self.assertTrue(outExtent['x'][1] > 0 and outExtent['x'][1] > outExtent['x'][0])
        
        

    def test_bar_chart(self):
        """ Test getting a bar chart data. """
        
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        data_mem = DataInMem(filepath)
        data_sample = data.sample()

        target = 'col-99'
        attribute = 'col-0'
        filters = [
            {'attr': 'col-0', 'type': 'In', 'isCat': True, 'range': ['a']},            
        ]

        plot='Bar'
        targetType='binary'
        
        for d in [data, data_mem, data_sample]:
            result = plot_data(d, target, attribute, filters=filters, plot=plot, targetType=targetType)
        
            self.assertTrue(np.all(list(result.keys())==['categories', 'classes', 'inData', 'outData']))     
               
            categories = result['categories']
            classes = result['classes']
            self.assertTrue(np.all(categories==['a', 'b', 'c', 'd']))
            self.assertTrue(np.all(classes==['x', 'y']))

            inData = result['inData']
            outData = result['outData']

            # Check filters were applied and counts are correct
            self.assertTrue(np.all(inData['x']==[250, 0, 0, 0]))
            self.assertTrue(np.all(inData['y']==[0, 0, 0, 0]))
            self.assertTrue(np.all(outData['x']==[250, 0, 0, 0]))
            self.assertTrue(np.all(outData['y']==[0, 250, 250, 250]))

    def test_get_nice_division(self):
        """ Test getting 'nice' division for histograms. """
        start = -0.91
        stop = 0.94
        nBins = 20
        div = get_nice_division(start, stop, nBins)
        self.assertTrue(len(div) == 20)
        self.assertTrue(div[0] == -1)
        self.assertTrue(div[-1] == 1)
        

    def test_dual_hist(self):
        """ Test getting dual histogram data. """

        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        data_mem = DataInMem(filepath)
        data_sample = data.sample()

        target = 'col-99'
        attribute = 'col-2'
        filters = [
            {'attr': 'col-99', 'type': 'In', 'isCat': True, 'range': ['x']},            
        ]

        plot='Bar'
        targetType='binary'
        
        for d in [data, data_mem, data_sample]:
            result = plot_data(d, target, attribute, filters=filters, plot=plot, targetType=targetType)            
            self.assertTrue(np.all(list(result.keys())==['categories', 'classes', 'inData', 'outData']))     
            
            categories = result['categories']
            classes = result['classes']            
            self.assertTrue(len(categories) > 0)
            self.assertTrue(np.all(classes==['x', 'y']))
            
            inData = result['inData']
            outData = result['outData']

            # Check filters were applied and counts are correct
            self.assertTrue(np.sum(inData['x']) == 250)
            self.assertTrue(np.sum(inData['y']) == 0)
            self.assertTrue(np.sum(outData['x']) == 250)
            self.assertTrue(np.sum(outData['y']) == 750)


        
if __name__ == '__main__':
    unittest.main()
