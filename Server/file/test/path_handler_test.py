import unittest
import os
import inspect
import sys

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from file.path_handler import process_filepath, filepath_from_home

class TestPathHandler(unittest.TestCase):

    def test_process_filepath(self):
        """ Test process filepath method. """
        filepath = os.path.join(parentdir, 'data', 'test_data_txt', 'sp500_data.csv')
        self.assertEqual(process_filepath(filepath), filepath)

        # get the filepath relative to the home directory
        home_path = filepath_from_home(filepath)
        self.assertFalse(os.path.isfile(home_path))

        # The home directory should be added
        self.assertEqual(process_filepath(home_path), os.path.join(filepath))

        
if __name__ == '__main__':
    unittest.main()
    
