import unittest
import os
import sys
import inspect
import logging

import pandas as pd
import numpy as np
import networkx as nx

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestRegressor

from causal.causal_model import CausalModel

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from ak_logger import logger

# disable logging
logger.setLevel(logging.CRITICAL)

class TestCausal(unittest.TestCase):
    """ Test causal model functions. """

    def test_create_causal_model(self):
        """ Test the create_causal_model method. """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - X + np.random.normal(size=N)

        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('W', 'T')
        G.add_edge('W', 'Y')

        
        scm = CausalModel(G, df)

        # check graph is the same
        self.assertTrue(nx.utils.graphs_equal(scm.causal_model.graph, G))


        # check type error raises
        self.assertRaises(TypeError, CausalModel, 'asdf', df)
        self.assertRaises(TypeError, CausalModel, G, 'asdf')

    
    def test_create_causal_model_specify_fun(self):
        """ Test the create_causal_model method while 
        specifying the functional form. """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - X + np.random.normal(size=N)

        # convert Y to class
        Y = np.where(Y > Y.mean(), 'a', 'b')
        
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('W', 'T')
        G.add_edge('W', 'Y')

        nx.set_node_attributes(G, {
            'T': {
                'label': "RandomForestRegressor",
                'module': 'sklearn.ensemble',
                'value': "RandomForestRegressor",
                'params': {}
            },
            'Y': {
                'label': "LogisticRegression",
                'module': "sklearn.linear_model",
                'value': "LogisticRegression",
                'params': {}
            }
        }, name='model')
                
        scm = CausalModel(G, df)
        
        self.assertTrue(isinstance(G.nodes['T']['causal_mechanism'] \
                                   .prediction_model \
                                   .sklearn_model, RandomForestRegressor))

        self.assertTrue(isinstance(G.nodes['Y']['causal_mechanism'] \
                                   .classifier_model \
                                   .sklearn_model, LogisticRegression))

        # check graph is the same
        self.assertTrue(nx.utils.graphs_equal(scm.causal_model.graph, G))


        # check type error raises
        self.assertRaises(TypeError, CausalModel, 'asdf', df)
        self.assertRaises(TypeError, CausalModel, G, 'asdf')

    def test_edge_strength(self):
        """ Test the create_causal_model method while 
        specifying the functional form. """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + 2*W + np.random.normal(size=N)
        Y = 2*W + X + np.random.normal(size=N)

        # convert Y to class
        Y = np.where(Y > Y.mean(), 'a', 'b')
        
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('W', 'T')
        G.add_edge('W', 'Y')

        nx.set_node_attributes(G, {
            'T': {
                'label': "RandomForestRegressor",
                'module': 'sklearn.ensemble',
                'value': "RandomForestRegressor",
                'params': {}
            },
            'Y': {
                'label': "LogisticRegression",
                'module': "sklearn.linear_model",
                'value': "LogisticRegression",
                'params': {}
            }
        }, name='model')
                
        scm = CausalModel(G, df)
        tstrength = scm.target_edge_strength('T')
        self.assertGreater(tstrength['W'], tstrength['Z'])
        
        ystrength = scm.target_edge_strength('Y')
        self.assertGreater(ystrength['W'], ystrength['X'])

        wstrength = scm.target_edge_strength('W')
        self.assertFalse({})

        
    def test_intrinsic_influence(self):
        """ Test the intrinsic influence method. """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = -Z + np.random.normal(size=N, scale=0.5)
        C = W
        T = Z + 2*C + np.random.normal(size=N)
        Y = 2*W + X + np.random.normal(size=N)

        # convert Y to class
        Y = np.where(Y > Y.mean(), 'a', 'b')
        
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'C': C, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('W', 'C')
        G.add_edge('Z', 'T')
        G.add_edge('Z', 'X')
        G.add_edge('X', 'Y')
        G.add_edge('C', 'T')
        G.add_edge('W', 'Y')

        scm = CausalModel(G, df)
        tinfluence = scm.intrinsic_influence('T')
        yinfluence = scm.intrinsic_influence('Y')

        # C should have zero influence on T
        self.assertAlmostEqual(tinfluence['C'], 0, 3)
        self.assertGreater(tinfluence['W'], tinfluence['Z'])

        # Nx variation is 0.5 and so should have less influence
        self.assertGreater(yinfluence['Z'], yinfluence['X'])
        self.assertGreater(yinfluence['W'], yinfluence['X'])

        
    def test_causal_effect_estimate(self):
        """ Test the estimating the average causal effect """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - X + np.random.normal(size=N)
       
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('W', 'T')
        G.add_edge('W', 'Y')

        scm = CausalModel(G, df)

        ate, ci = scm.causal_effect_estimate('X', 'Y', 1, 0)
        self.assertTrue(-1.1 <= ate <= -0.8)
        self.assertTrue(ci[0] <= ate <= ci[1])

    def test_interventional_effect_estimate(self):
        """ Test the estimating the average causal effect """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - X + 0.5*T + np.random.normal(size=N)
       
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('W', 'T')
        G.add_edge('W', 'Y')
        G.add_edge('T', 'Y')

        scm = CausalModel(G, df)

        result = scm.interventional_effect_estimate('X', 1, 0)
        ate, ci = result['Y']
        self.assertTrue(-1.1 <= ate <= -0.8)
        self.assertTrue(ci[0] <= ate <= ci[1])

        # test shift intervention
        result = scm.interventional_effect_estimate('X', 2)
        ate, ci = result['Y']
        self.assertTrue(-2.2 <= ate <= -1.6)
        self.assertTrue(ci[0] <= ate <= ci[1])

        # test multiple successors
        result = scm.interventional_effect_estimate('Z', 1, 0)
        self.assertEqual(len(result), 2)
        tate, tci = result['T']
        yate, yci = result['Y']
        
        self.assertTrue(0.8 <= tate <= 1.2)
        self.assertTrue(tci[0] <= tate <= tci[1])

        self.assertTrue(0.3 <= yate <= 0.7)
        self.assertTrue(yci[0] <= yate <= yci[1])
        
        
    def test_unobserved_confounders_unshielded(self):
        """ Test identifying unobserved confounders. """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - X + np.random.normal(size=N)

        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')

        # NOTE: W is a confounder for X and Y
        scm = CausalModel(G, df)
        
        confounders = scm.unobserved_confounders('T', 'Y')
        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        # Remove unobserved confounding
        G.add_edge("W", "T")
        G.add_edge("W", "Y")

        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('T', 'Y')
        self.assertEqual(len(confounders), 0)


    def test_unobserved_confounders_unshielded_class_one(self):
        """ Test identifying unobserved confounders (classifier). """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + np.random.normal(size=N)
        Y = 2*W - X + np.random.normal(size=N)
        
        Wa = 3 * W + X + np.random.normal(size=N)
        Wb = -3 * W + X + np.random.normal(size=N)
        Wc = 3 * W - X + np.random.normal(size=N)
        Wd = -3 * W - X + np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        

        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'C': C, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('X', 'C')
        
        # NOTE: W is a confounder for C1 and C2
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C', 'Y')
        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        confounders = scm.unobserved_confounders('C', 'T')
        self.assertEqual(len(confounders), 0)

        # Remove unobserved confounding
        G.add_edge("W", "Y")
        G.add_edge("W", "C")
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C', 'Y')
        self.assertEqual(len(confounders), 0)

        confounders = scm.unobserved_confounders('C', 'T')
        self.assertEqual(len(confounders), 0)
        

    def test_unobserved_confounders_unshielded_class_two_simple(self):
        """ Test identifying unobserved confounders (between 2 classifiers). """
        N = 1000
        W = np.random.normal(size=N)
        
        Wa = 2 * W  + np.random.normal(size=N)
        Wb = -2 * W  + np.random.normal(size=N)
        Wc = 2 * W  + np.random.normal(size=N)
        Wd = -2 * W + np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C1 = np.where(classnums==0, 'a',
                      np.where(classnums==1, 'b',
                               np.where(classnums==2, 'c', 'd')))
        

        Wa = 1 * W  + np.random.normal(size=N)
        Wb = -1 * W + np.random.normal(size=N)
        Wc = 1 * W  + np.random.normal(size=N)
        Wd = -1 * W  + np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C2 = np.where(classnums==0, 'a',
                      np.where(classnums==1, 'b',
                               np.where(classnums==2, 'c', 'd')))
        
        df = pd.DataFrame(data={'C1': C1, 'W': W, 'C2': C2})
        G = nx.DiGraph()
        G.add_node("C1")
        G.add_node("C2")
        
        # NOTE: W is a confounder for C1 and C2
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C1', 'C2')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        
        # Remove unobserved confounding
        G = nx.DiGraph()
        G.add_edge('W', 'C1')
        G.add_edge('W', 'C2')
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C1', 'C2')
        self.assertEqual(len(confounders), 0)

    
    def test_unobserved_confounders_unshielded_class_two(self):
        """ Test identifying unobserved confounders (between 2 classifiers). """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
    
        Wa = 3 * W + X + np.random.normal(size=N)
        Wb = -3 * W + X + np.random.normal(size=N)
        Wc = 3 * W - X + np.random.normal(size=N)
        Wd = -3 * W - X + np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C1 = np.where(classnums==0, 'a',
                      np.where(classnums==1, 'b',
                               np.where(classnums==2, 'c', 'd')))
        
        Wa = -2 * W + Z + np.random.normal(size=N)
        Wb = 2 * W + Z + np.random.normal(size=N)
        Wc = 2 * W - Z + np.random.normal(size=N)
        Wd = -2 * W - Z + np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C2 = np.where(classnums==0, 'a',
                      np.where(classnums==1, 'b',
                               np.where(classnums==2, 'c', 'd')))
        
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'C1': C1, 'X': X, 'C2': C2})
        G = nx.DiGraph()
        G.add_edge('Z', 'C2')
        G.add_edge('X', 'C1')
        
        # NOTE: W is a confounder for T, Y and C
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C1', 'C2')
        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        G = nx.DiGraph()
        G.add_edge('Z', 'C2')
        G.add_edge('X', 'C1')
                
        # Remove unobserved confounding
        G.add_edge("W", "C1")
        G.add_edge("W", "C2")
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C1', 'C2')
        self.assertEqual(len(confounders), 0)


    def test_unobserved_class_confounders_unshielded(self):
        """ Test identifying unobserved confounders (confounder classifier). """
        N = 1000
        np.random.seed(0)
        
        Z = np.random.normal(size=N)
    
        Wa = np.random.normal(size=N)
        Wb = np.random.normal(size=N)
        Wc = np.random.normal(size=N)
        Wd = np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)

        X = 2 * classnums - Z + np.random.normal(size=N)
        Y = -classnums + np.random.normal(size=N)
        
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        
        df = pd.DataFrame(data={'X': X, 'Y': Y, 'C': C, 'Z': Z})
        G = nx.DiGraph()
        G.add_node('Y')
        G.add_edge('Z', 'X')
        
        # NOTE: C is a confounder for X and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'C')

        # Remove unobserved confounding

        G = nx.DiGraph()
        G.add_edge('Z', 'X')
        G.add_edge('C', 'X')
        G.add_edge('C', 'Y')
                
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')
        self.assertEqual(len(confounders), 0)

        
    def test_unobserved_class_confounders_unshielded_class(self):
        """ Test identifying unobserved confounders (confounder classifier). """
        N = 1000

        R = np.random.normal(size=N)
        Z = np.random.normal(size=N)
    
        Wa = np.random.normal(size=N)
        Wb = np.random.normal(size=N)
        Wc = np.random.normal(size=N)
        Wd = np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        
        Y = -classnums + np.random.normal(size=N)

        Wa = Z + classnums + np.random.normal(size=N)
        Wb = Z - classnums + np.random.normal(size=N)
        Wc = Z + classnums + np.random.normal(size=N)
        Wd = Z - classnums + np.random.normal(size=N)
        
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        X = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        
        
        df = pd.DataFrame(data={'X': X, 'Y': Y, 'C': C, 'Z': Z, 'R': R})
        G = nx.DiGraph()
        G.add_node('Y')
        G.add_edge('Z', 'X')
        
        # NOTE: C is a confounder for X and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'C')

        # Remove unobserved confounding

        G = nx.DiGraph()
        G.add_edge('Z', 'X')
        G.add_edge('C', 'X')
        G.add_edge('C', 'Y')
                
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')
        self.assertEqual(len(confounders), 0)


    def test_unobserved_confounders_shielded(self):
        """ Test identifying unobserved confounders. """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        W2 = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + 0.5*W2 + np.random.normal(size=N)
        Y = 2*W - T + 0.4 * W2 + np.random.normal(size=N)

        df = pd.DataFrame(data={'Z': Z, 'W': W, 'W2': W2, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('T', 'Y')
        G.add_edge('W2', 'T')
        G.add_edge('W2', 'Y')

        # NOTE: W is a confounder for X and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('T', 'Y')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        G.add_edge("W", "T")
        G.add_edge("W", "Y")

        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('T', 'Y')
        self.assertEqual(len(confounders), 0)

        
    def test_unobserved_confounders_shielded_class_tar(self):
        """ Test identifying unobserved confounders. (classifier target) """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)

        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - T + np.random.normal(size=N)

        Wa = 3 * W + Y + np.random.normal(size=N)
        Wb = -3 * W + Y + np.random.normal(size=N)
        Wc = 3 * W - Y + np.random.normal(size=N)
        Wd = -3 * W - Y + np.random.normal(size=N)
        
        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'C': C, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('T', 'Y')
        G.add_edge('Y', 'C')
        
        # NOTE: W is a confounder for C and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('Y', 'C')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        
        G.add_edge("W", "T")
        G.add_edge("W", "Y")
        G.add_edge("W", "C")

        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('Y', 'C')
        self.assertEqual(len(confounders), 0)


    def test_unobserved_confounders_shielded_class_src(self):
        """ Test identifying unobserved confounders. (classifier source) """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)

        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)

        Wa = 3 * W  + np.random.normal(size=N)
        Wb = -3 * W + np.random.normal(size=N)
        Wc = 3 * W  + np.random.normal(size=N)
        Wd = -3 * W + np.random.normal(size=N)
        
        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))

        Y = 2*W - T + (classnums+1) + np.random.normal(size=N)

        df = pd.DataFrame(data={'Z': Z, 'W': W, 'C': C, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('T', 'Y')
        G.add_edge('C', 'Y')
        
        # NOTE: W is a confounder for C and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C', 'Y')
        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('T', 'Y')
        G.add_edge('C', 'Y')
                
        
        G.add_edge("W", "T")
        G.add_edge("W", "Y")
        G.add_edge("W", "C")

        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('Y', 'C')
        self.assertEqual(len(confounders), 0)

    def test_unobserved_confounders_shielded_class_both(self):
        """ Test identifying unobserved confounders. (classifier source) """
        N = 1000
        np.random.seed(0)
        W = np.random.normal(size=N)

        Wa = 3 * W  + np.random.normal(size=N)
        Wb = -3 * W + np.random.normal(size=N)
        Wc = 3 * W  + np.random.normal(size=N)
        Wd = -3 * W + np.random.normal(size=N)
        
        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C1 = np.where(classnums==0, 'a',
                      np.where(classnums==1, 'b',
                               np.where(classnums==2, 'c', 'd')))

        Wa = 3 * W  + classnums + np.random.normal(size=N)
        Wb = -3 * W - classnums + np.random.normal(size=N)
        Wc = 3 * W  + classnums + np.random.normal(size=N)
        Wd = -3 * W - classnums + np.random.normal(size=N)
        
        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C2 = np.where(classnums==0, 'a',
                      np.where(classnums==1, 'b',
                               np.where(classnums==2, 'c', 'd')))
        

        df = pd.DataFrame(data={'W': W, 'C1': C1, 'C2': C2})
        G = nx.DiGraph()
        G.add_edge('C1', 'C2')
        
        # NOTE: W is a confounder for C1 and C2
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C1', 'C2')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'W')

        # remove confounding
        G = nx.DiGraph()
        G.add_edge('C1', 'C2')
        G.add_edge('W', 'C1')
        G.add_edge('W', 'C2')
       
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('C1', 'C2')
        self.assertEqual(len(confounders), 0)

    def test_unobserved_class_confounders_shielded(self):
        """ Test identifying unobserved confounders (confounder classifier). """
        N = 1000
        np.random.seed(0)
        Z = np.random.normal(size=N)
    
        Wa = np.random.normal(size=N)
        Wb = np.random.normal(size=N)
        Wc = np.random.normal(size=N)
        Wd = np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)

        X = 2 * classnums - Z + np.random.normal(size=N)
        Y = -classnums + X + np.random.normal(size=N)
        
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        
        df = pd.DataFrame(data={'X': X, 'Y': Y, 'C': C, 'Z': Z})
        G = nx.DiGraph()
        G.add_edge('X', 'Y')
        G.add_edge('Z', 'X')
        
        # NOTE: C is a confounder for X and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'C')

        # Remove unobserved confounding

        G = nx.DiGraph()
        G.add_edge('X', 'Y')
        G.add_edge('Z', 'X')
        G.add_edge('C', 'X')
        G.add_edge('C', 'Y')
                
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')
        self.assertEqual(len(confounders), 0)

        
    def test_unobserved_class_confounders_shielded_class_src(self):
        """ Test identifying unobserved confounders (confounder classifier). """
        N = 1000

        R = np.random.normal(size=N)
        Z = np.random.normal(size=N)
    
        Wa = np.random.normal(size=N)
        Wb = np.random.normal(size=N)
        Wc = np.random.normal(size=N)
        Wd = np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))
        

        Wa = Z + classnums + np.random.normal(size=N)
        Wb = Z - classnums + np.random.normal(size=N)
        Wc = Z + classnums + np.random.normal(size=N)
        Wd = Z - classnums + np.random.normal(size=N)
        
        X_classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        X = np.where(X_classnums==0, 'a',
                     np.where(X_classnums==1, 'b',
                              np.where(X_classnums==2, 'c', 'd')))
        
        Y = -classnums - X_classnums + np.random.normal(size=N)

        df = pd.DataFrame(data={'X': X, 'Y': Y, 'C': C, 'Z': Z, 'R': R})
        G = nx.DiGraph()
        G.add_edge('X', 'Y')
        G.add_edge('Z', 'X')
        
        # NOTE: C is a confounder for X and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'C')

        # Remove unobserved confounding

        G = nx.DiGraph()
        G.add_edge('X', 'Y')
        G.add_edge('Z', 'X')
        G.add_edge('C', 'X')
        G.add_edge('C', 'Y')
                
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')
        self.assertEqual(len(confounders), 0)


    def test_unobserved_class_confounders_shielded_class_tar(self):
        """ Test identifying unobserved confounders (confounder classifier). """
        N = 1000

        R = np.random.normal(size=N)
        Z = np.random.normal(size=N)
    
        Wa = np.random.normal(size=N)
        Wb = np.random.normal(size=N)
        Wc = np.random.normal(size=N)
        Wd = np.random.normal(size=N)

        # create the class
        classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        C = np.where(classnums==0, 'a',
                     np.where(classnums==1, 'b',
                              np.where(classnums==2, 'c', 'd')))

        Y = -classnums + np.random.normal(size=N)

        Wa = Y + classnums + np.random.normal(size=N)
        Wb = Y - classnums + np.random.normal(size=N)
        Wc = Y + classnums + np.random.normal(size=N)
        Wd = Y - classnums + np.random.normal(size=N)
        
        X_classnums = np.argmax([Wa, Wb, Wc, Wd], axis=0)
        X = np.where(X_classnums==0, 'a',
                     np.where(X_classnums==1, 'b',
                              np.where(X_classnums==2, 'c', 'd')))
        


        df = pd.DataFrame(data={'X': X, 'Y': Y, 'C': C, 'Z': Z, 'R': R})
        G = nx.DiGraph()
        G.add_edge('Y', 'X')
        
        # NOTE: C is a confounder for X and Y
        
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('Y', 'X')

        self.assertGreaterEqual(len(confounders), 1)
        self.assertEqual(confounders[0]['name'], 'C')

        # Remove unobserved confounding

        G = nx.DiGraph()
        G.add_edge('Y', 'X')
        G.add_edge('C', 'X')
        G.add_edge('C', 'Y')
                
        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('X', 'Y')
        self.assertEqual(len(confounders), 0)

     
    def test_score(self):
        """ Test the score method """
        N = 1000
        Z = np.random.normal(size=N)
        W = np.random.normal(size=N)
        X = np.random.normal(size=N)
        T = Z + W + np.random.normal(size=N)
        Y = 2*W - X + np.random.normal(size=N)

        # convert Y to class
        Y = np.where(Y > Y.mean(), 'a', 'b')
        
        df = pd.DataFrame(data={'Z': Z, 'W': W, 'T': T, 'X': X, 'Y': Y})
        G = nx.DiGraph()
        G.add_edge('Z', 'T')
        G.add_edge('X', 'Y')
        G.add_edge('W', 'T')
        G.add_edge('W', 'Y')

        scm = CausalModel(G, df)
        self.assertEqual(scm.score("Z"), 0.0)
        self.assertTrue(0<=scm.score('T')<=1)
        self.assertTrue(0<=scm.score('Y')<=1)
        
        
    def test_sp500(self):
        """ Test with the sp500 dataset. """
        filepath = parentdir+"/data/sp500_data.csv"
        np.random.seed(0)
        df = pd.read_csv(filepath)

        
        G = nx.DiGraph()
        G.add_node('price/earnings')
        G.add_node("price")
                
        scm = CausalModel(G, df)
        
        confounders = scm.unobserved_confounders('price', 'price/earnings')

        self.assertFalse(any(np.isnan(c['pval']) for c in confounders))
        self.assertEqual(confounders[0]['name'], 'eps')

        G = nx.DiGraph()
        G.add_edge('price', 'price/earnings')
        G.add_edge('eps', 'price/earnings')

        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('price', 'eps')
        self.assertNotEqual(confounders[0]['name'], 'price/earnings')

        G = nx.DiGraph()
        G.add_edge('sector', 'fut_return')        
        G.add_edge('stddev', 'fut_return')        
        G.add_edge('payout_ratio', 'fut_return')        
        G.add_edge('dividend_yield', 'payout_ratio')
        G.add_edge('eps', 'payout_ratio')
        G.add_edge('eps', 'price')
        
        df['const'] = 'a'

        scm = CausalModel(G, df)
        confounders = scm.unobserved_confounders('sector', 'fut_return')


    def test_stroke(self):
        """ Test with the stroke dataset. """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        
        G = nx.DiGraph()        
        G.add_edge('age', 'hypertension')
        G.add_edge('age', 'bmi')
        G.add_edge('bmi', 'hypertension')

        scm = CausalModel(G, df)

        # should not crash
        confounders = scm.unobserved_confounders('age', 'bmi')
        
        G = nx.DiGraph()        
        G.add_edge('age', 'heart_disease')
        G.add_edge('age', 'bmi')
        G.add_edge('bmi', 'heart_disease')

        scm = CausalModel(G, df)

        # should not crash
        confounders = scm.unobserved_confounders('age', 'heart_disease')

        G = nx.DiGraph()
        G.add_edge('age', 'heart_disease')
        G.add_edge('age', 'stroke')

        scm = CausalModel(G, df)

        # should not crash
        confounders = scm.unobserved_confounders('stroke', 'heart_disease')
        self.assertFalse('age' in [c['name'] for c in confounders])

        
if __name__ == '__main__':
    unittest.main()
    
