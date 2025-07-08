import os
import sys
from pathlib import Path
import inspect

def process_filepath(filepath):
    """ Augments the filepath by prepending the 
    home directory if necessary. 

    Args:
        filepath: Location of a file.

    Returns:
        The possibly augmented filepath.
    """
    currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
    if filepath is None:
        return None
    
    if os.path.isfile(filepath):
        return filepath

    home = str(Path.home())
    homepath = os.path.join(home, filepath)
    if os.path.isfile(homepath):
        return homepath  # return the original path

    dirpath = currentdir + '/' + filepath
    if os.path.isfile(dirpath):
        return dirpath

    dirpath2 = currentdir + '/../' + filepath

    if os.path.isfile(dirpath2):
        return dirpath2

    # determine if application is a script file or frozen exe
    if getattr(sys, 'frozen', False):
        application_path = os.path.dirname(sys.executable)
    elif __file__:
        application_path = os.path.dirname(__file__)

    dirpath3 = application_path + '/' + filepath
    if os.path.isfile(dirpath3):
        return dirpath3
    
    return filepath
    

def filepath_from_home(filepath):
    """ Generates the filepath relative to home. """
    if filepath is None:
        return None
    
    home = str(Path.home())
    return os.path.relpath(filepath, home)
    
