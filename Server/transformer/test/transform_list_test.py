import unittest
import os
import shutil
import warnings
import sys
import inspect
import logging

import numpy as np
import pandas as pd

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data import Data
from transformer.transform_list import TransformList
from transformer.transform import RenameTransform

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)


class TestTransformList(unittest.TestCase):
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
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        df['col-2'] = 10  # set to constant
        df['col-10'] = pd.date_range(start='01/01/1988', periods=N)
        df.loc[199, 'col-30'] = 'a'
        
        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        os.remove('test_data/test_data.csv')
        os.rmdir('test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')


    def test_add_log_transformation(self):
        """ Test adding a log transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform = {'tType': 'Log', 'attr': 'col-2', 'base': 10}

        transforms = TransformList()
        transforms.apply_transform(data, transform)
        
        uid = transforms.transform_list[0].uid
        self.assertTrue(np.all(data['col-2'].sample(frac=0.1).compute() == 1.0))
        self.assertEqual(transforms.adjacency_list[uid], [])
        self.assertEqual(len(transforms.transform_list), 1)

    def test_add_log_log_transformation(self):
        """ Test adding a dependent log transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}

        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid

        self.assertTrue(np.all(data['col-2'].sample(frac=0.1).compute() == 0.0))
        self.assertEqual(transforms.adjacency_list[uid1], [uid2])
        self.assertEqual(len(transforms.transform_list), 2)

    def test_cell_split_transformation(self):
        """ Test adding a cell split transform.  """
        filepath = parentdir+"/data/final_track_data.csv"

        data = Data(filepath, options={'encoding': 'utf-8'})
        sample = data.sample()

        transform = {'tType': "CellSplit", "attr": 'artist_genre',
                     'delimiter': ',', 'ordered': False, 'strip': '[]', 'quote': "'"}
        
        transforms = TransformList()
        transforms.apply_transform(sample, transform)

        self.assertTrue('artist_genre_dance pop' in sample.columns)
        self.assertTrue('artist_genre_pop' in sample.columns)
        self.assertTrue('artist_genre_zolo' in sample.columns)

        
    def test_add_nom_filter_transformation(self):
        """ Test adding a nominal filter transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'FilterNom', 'attr': 'col-0', 'filter_cats': ['a', 'b']}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform3 = {'tType': 'OHE', 'attr': 'col-0'}

        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid

        uni = data.filter_data['col-0'].unique().compute()        
        self.assertListEqual(uni.tolist(), ['a', 'b'])        

        
    def test_add_date_filter_transformation(self):
        """ Test adding a datetime filter transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Dtype', 'attr': 'col-10', 'new_type': 'DateTime'}
        transform2 = {'tType': 'FilterDate', 'attr': 'col-10', 'lb': '1989-01-01'}
        transform3 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}


        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid

        self.assertGreaterEqual(data.filter_data['col-10'].min().compute(),
                                pd.Timestamp('1989-01-01'))
        
    def test_add_rank_transformation(self):
        """ Test adding rank transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Rank', 'attr': 'col-0', 'rankattr': 'col-2', 'ranktiers': 4}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform3 = {'tType': 'OHE', 'attr': 'col-0'}

        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid

        self.assertTrue('col-0_rank4_col-2' in data.columns)        
        
    def test_add_create_derived_transformation(self):
        """ Test adding a dependent derived transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Filter', 'attr': 'col-1', 'lb': 0}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform3 = {'tType': 'Clamp', 'attr': 'col-20', 'lb': 0, 'ub': 1}
        transform4 = {'tType': 'Derived', 'attr': 'derived', 'expr': 'col-1 + 3* col-2'}
        transform5 = {'tType': 'Norm', 'attr': 'col-1', 'newmin': 0, 'newmax': 1}
        transform6 = {'tType': 'Custom', 'attr': 'derived', 'expr': 'derived + 1'}
        
        transforms = TransformList()
        self.assertEqual(len(transforms), 0)
        
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)
        transforms.apply_transform(data, transform4)
        transforms.apply_transform(data, transform5)
        transforms.apply_transform(data, transform6)

        self.assertEqual(len(transforms), 6)
        
        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid
        uid4 = transforms.transform_list[3].uid
        uid5 = transforms.transform_list[4].uid
        uid6 = transforms.transform_list[5].uid
        
        self.assertTrue('derived' in data.columns)
        self.assertEqual(transforms.adjacency_list[uid1], [uid4, uid5])
        self.assertEqual(transforms.adjacency_list[uid2], [uid4])
        self.assertEqual(transforms.adjacency_list[uid3], [])
        self.assertEqual(transforms.adjacency_list[uid4], [uid6])
        self.assertEqual(transforms.adjacency_list[uid5], [])
        self.assertEqual(transforms.adjacency_list[uid6], [])        

        # test disable a transform
        transforms.disable(uid1)
        self.assertFalse(transforms.get_transform_by_id(uid1).enabled)

        # derived transforms should be disabled        
        self.assertFalse(transforms.get_transform_by_id(uid4).enabled)
        self.assertFalse(transforms.get_transform_by_id(uid5).enabled)

        # uid6 dependens on the derived attribute
        self.assertFalse(transforms.get_transform_by_id(uid6).enabled)

        self.assertTrue(transforms.get_transform_by_id(uid2).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid3).enabled)

        transforms.enable(uid1)
        transforms.enable(uid4)
        transforms.enable(uid5)
        transforms.enable(uid6)

        transforms.disable(uid3)
        self.assertTrue(transforms.get_transform_by_id(uid1).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid2).enabled)
        self.assertFalse(transforms.get_transform_by_id(uid3).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid5).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid6).enabled)

        transforms.enable(uid3)

        # test deleting a transform
        transforms.delete(uid1)

        # derived attribute should be disabled
        self.assertFalse(transforms.get_transform_by_id(uid4).enabled)
        self.assertFalse(transforms.get_transform_by_id(uid5).enabled)

        # derived attribute transform
        self.assertFalse(transforms.get_transform_by_id(uid6).enabled)

        self.assertTrue(transforms.get_transform_by_id(uid2).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid3).enabled)

        transforms.enable(uid4)
        transforms.enable(uid5)
        transforms.enable(uid6)
        
        transforms.delete(uid3)
        self.assertTrue(transforms.get_transform_by_id(uid2).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid5).enabled)

        self.assertTrue(transforms.get_transform_by_id(uid6).enabled)

        transforms.delete(uid2)
        self.assertFalse(transforms.get_transform_by_id(uid4).enabled)
        self.assertFalse(transforms.get_transform_by_id(uid6).enabled)


    def test_get_transitive_dependent(self):
        """ Test adding a dependent derived transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Filter', 'attr': 'col-1', 'lb': 0}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform3 = {'tType': 'Clamp', 'attr': 'col-20', 'lb': 0, 'ub': 1}
        transform4 = {'tType': 'Derived', 'attr': 'derived', 'expr': 'col-1 + 3* col-2'}
        transform5 = {'tType': 'Norm', 'attr': 'col-1', 'newmin': 0, 'newmax': 1}
        transform6 = {'tType': 'Custom', 'attr': 'derived', 'expr': 'derived + col-1'}
        
        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)
        transforms.apply_transform(data, transform4)
        transforms.apply_transform(data, transform5)
        transforms.apply_transform(data, transform6)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid
        uid4 = transforms.transform_list[3].uid
        uid5 = transforms.transform_list[4].uid
        uid6 = transforms.transform_list[5].uid

        tform = transforms.get_transform_by_id(uid6)
        dependent = transforms.transitive_dependent_transforms(tform)
        dep_ids = [d.uid for d in dependent]
        self.assertListEqual(dep_ids, [uid1, uid2, uid4, uid5])

    def test_created_attr_disable_rank(self):
        """ Test disable dependent transform of created attribute. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)

        transform1 = {'tType': 'Rank', 'attr': 'sector',
                      'rankattr': 'dividend', 'ranktiers': 3}
        transform2 = {'tType': 'FilterNom', 'attr': 'sector_rank3_dividend',
                      'filter_cats': ['rank_2']}

        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid

        transforms.disable(uid1)
        self.assertFalse(transforms.get_transform_by_id(uid2).enabled)

    def test_created_attr_disable_ohe(self):
        """ Test disable dependent transform of created attribute. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)

        transform1 = {'tType': 'OHE', 'attr': 'sector'}
        transform2 = {'tType': 'FilterNom', 'attr': 'sector_Financials',
                      'filter_cats': ['1']}
        transform3 = {'tType': 'Clamp', 'attr': 'eps', 'lb': 0, 'ub': 1}
        
        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid

        transforms.disable(uid1)
        self.assertFalse(transforms.get_transform_by_id(uid2).enabled)
        self.assertTrue(transforms.get_transform_by_id(uid3).enabled)

        
    def test_set_type_transformation(self):
        """ Test setting the type. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)

        # There is a small chance the 'a' may be included in
        # the sample for detect_types
        while data.types['col-30'] != 'Numerical':
            data = Data(filepath)

            
        transform1 = {'tType': 'Dtype', 'attr': 'col-30', 'new_type': 'Nominal'}

        transforms = TransformList()
        transforms.apply_transform(data, transform1)

        self.assertEqual(data.types['col-30'], 'Nominal')
        self.assertTrue(np.any(data['col-30']=='a').compute())

    def test_set_type_transformation2(self):
        """ Test setting the type after a previous transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)

        # There is a small chance the 'a' may be included in
        # the sample for detect_types
        while data.types['col-30'] != 'Numerical':
            data = Data(filepath)

        transform1 = {'tType': 'Clamp', 'attr': 'col-30', 'lb': 0, 'ub': 1}
        transform2 = {'tType': 'Dtype', 'attr': 'col-30', 'new_type': 'Nominal'}

        transforms = TransformList()        
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)

        self.assertEqual(data.types['col-30'], 'Nominal')
        self.assertFalse(np.any(data['col-30']=='a').compute())
        

    def test_set_type_transformation_sample(self):
        """ Test setting the type for a sample. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)

        # There is a small chance the 'a' may be included in
        # the sample for detect_types
        while data.types['col-30'] != 'Numerical':
            data = Data(filepath)

        sample = data.sample(1000)
        
        transform1 = {'tType': 'Dtype', 'attr': 'col-30', 'new_type': 'Nominal'}

        transforms = TransformList()
        transforms.apply_transform(sample, transform1)

        self.assertEqual(sample.types['col-30'], 'Nominal')
        self.assertTrue(np.any(sample['col-30']=='a'))

    def test_set_type_transformation_sample2(self):
        """ Test setting the type of a sample after a previous transform. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)

        # There is a small chance the 'a' may be included in
        # the sample for detect_types
        while data.types['col-30'] != 'Numerical':
            data = Data(filepath)

        sample = data.sample(1000)

        transform1 = {'tType': 'Clamp', 'attr': 'col-30', 'lb': 0, 'ub': 1}
        transform2 = {'tType': 'Dtype', 'attr': 'col-30', 'new_type': 'Nominal'}

        transforms = TransformList()        
        transforms.apply_transform(sample, transform1)
        transforms.apply_transform(sample, transform2)
        
        self.assertEqual(data.types['col-30'], 'Nominal')
        self.assertFalse(np.any(data['col-30']=='a').compute())

        self.assertEqual(sample.types['col-30'], 'Nominal')
        self.assertFalse(np.any(sample['col-30']=='a'))
        
        
    def test_rename_transformation(self):
        """ Test adding renaming a column. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Filter', 'attr': 'col-1', 'lb': 0}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform3 = {'tType': 'Clamp', 'attr': 'col-20', 'lb': 0, 'ub': 1}
        transform4 = {'tType': 'Derived', 'attr': 'derived', 'expr': 'col-1 + 3* col-2'}
        transform5 = {'tType': 'ColNameChange', 'attr': 'col-1', 'name': 'column-one'}
        transform6 = {'tType': 'Norm', 'attr': 'column-one', 'newmin': 0, 'newmax': 1}
        transform7 = {'tType': 'Custom', 'attr': 'derived', 'expr': 'derived + 1'}
         
        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)
        transforms.apply_transform(data, transform4)
        new_attr = transforms.apply_transform(data, transform5)
        self.assertEqual(new_attr, "column-one")

        self.assertTrue(transforms.get_rename_transform('col-2') is None)
        self.assertFalse(transforms.get_rename_transform('col-1') is None)

        self.assertEqual(transforms.get_rename_transform('col-1').name, 'column-one')
        
        transforms.apply_transform(data, transform6)
        transforms.apply_transform(data, transform7)
        
        self.assertTrue('column-one' in data.columns)
        self.assertFalse('col-1' in data.columns)        

        for t in transforms.transform_list:
            if not isinstance(t, RenameTransform):
                self.assertNotEqual(t.attr, 'col-1')
        
        self.assertEqual(transforms.transform_list[3].expr, 'column-one + 3* col-2')
        
        visible = transforms.visible_list()
        self.assertEqual(len(visible), 5)
        self.assertEqual(visible[0]['tType'], 'Filter')
        self.assertEqual(visible[1]['tType'], 'Log')
        self.assertEqual(visible[2]['tType'], 'Clamp')
        self.assertEqual(visible[3]['tType'], 'Norm')
        self.assertEqual(visible[4]['tType'], 'Custom')

        # Test the rename gets a reapplied correctly
        uid1 = transforms.transform_list[0].uid
        transforms.delete(uid1)

        data.reset_data()

        transforms.apply(data)
        self.assertTrue('column-one' in data.columns)
        self.assertFalse('col-1' in data.columns)        
        

    def test_delete(self):
        """ Test deleting a transform from the list. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)

        transform1 = {'tType': 'Clamp', 'attr': 'col-2', 'lb': 0, 'ub': 1}
        transform2 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform3 = {'tType': 'Missing', 'attr': 'col-2', 'method': 'Zero', 'replaceVal': None}
        
        transforms = TransformList()
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)

        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid
        
        transforms.delete(uid2)
        self.assertFalse(transforms.get_transform_by_id(uid3).enabled)
        
        
        # NOTE: This had been the source of a bug since uid2 is not removed
        # from uid1's dependency list.
        transforms.disable(uid1)

        self.assertEqual(len(transforms.visible_list()), 2)

    def test_derived_delete_dependency(self):
        """ Test deleting a derived dependent transformation. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        
        transform1 = {'tType': 'Log', 'attr': 'col-2', 'base': 10}
        transform2 = {'tType': 'Derived', 'attr': 'derived', 'expr': 'col-1 + 3* col-2'}
        transform3 = {'tType': 'Log', 'attr': 'derived', 'base': 10}
        
        transforms = TransformList()

        # catch warnings related to log of negative values
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")

            transforms.apply_transform(data, transform1)
            transforms.apply_transform(data, transform2)
            transforms.apply_transform(data, transform3)
        
        uid1 = transforms.transform_list[0].uid 
        uid2 = transforms.transform_list[1].uid
        uid3 = transforms.transform_list[2].uid

        transforms.delete(uid1)
        
        self.assertFalse(transforms.get_transform_by_id(uid2).enabled)
        self.assertFalse(transforms.get_transform_by_id(uid3).enabled)

        data.reset_data()
        transforms.enable(uid2)
        transforms.enable(uid3)
        
        # ignore negative log warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            transforms.apply(data)

        
        self.assertTrue('derived' in data.columns)
        
        
    def test_create_derived_rename_remove(self):
        """ Test renaming a derived attribute. """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)
        transform1 = {'tType': 'Derived', 'attr': 'derived', 'expr': 'col-1 + 3* col-2'}        
        transform2 = {'tType': 'Log', 'attr': 'derived', 'base': 10}
        transform3 = {'tType': 'ColNameChange', 'attr': 'derived', 'name': 'log-derived'}
        transform4 = {'tType': 'Filter', 'attr': 'log-derived', 'lb': 1}
         
        transforms = TransformList()
        self.assertEqual(len(transforms), 0)
        
        transforms.apply_transform(data, transform1)
        transforms.apply_transform(data, transform2)
        transforms.apply_transform(data, transform3)
        transforms.apply_transform(data, transform4)
        self.assertEqual(len(transforms), 4)
        
        uid4 = transforms.transform_list[-1].uid
        transforms.delete(uid4)
        self.assertEqual(len(transforms), 3)
        
        data.reset_data()
        transforms.apply(data)

        self.assertTrue("log-derived" in data.columns)
        
if __name__ == '__main__':
    unittest.main()
    
