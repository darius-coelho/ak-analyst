import setuptools
from distutils.core import setup, Extension
from Cython.Build import cythonize
from Cython.Distutils import build_ext
import numpy

setup(
    name="ak-analyst",
    version="1.0.0",
    packages=['endpoints', 'transformer', 'actions', 'store', 'analyst',
              'plotting', 'predictive', 'ak_logger', 'strutils', 'dataframes',
              'file', 'config_parameters', 'causal', 'ak_threads'],
    include_dirs=[numpy.get_include()]
)
