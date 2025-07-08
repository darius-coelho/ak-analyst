import pandas as pd
import numpy as np
import networkx as nx

from dowhy import gcm
from dowhy.gcm.graph import get_ordered_predecessors

from pandas.api.types import is_numeric_dtype
from scipy.stats import pearsonr, spearmanr, f_oneway
from sklearn.base import is_classifier, is_regressor
from sklearn.model_selection import train_test_split
from scipy.stats import entropy

from dowhy.gcm.fcms import AdditiveNoiseModel, ClassifierFCM
from dowhy.gcm.ml.regression import SklearnRegressionModel
from dowhy.gcm.ml.classification import SklearnClassificationModel
from dowhy.gcm.util.general import shape_into_2d, fit_one_hot_encoders, apply_one_hot_encoding

from ak_logger import logger, log_it

from actions.sklearn_action import get_instance


class CausalModel:

    @log_it
    def __init__(self, G, data):
        """ Fits a structural causal model based on the graph and data. 
        
        Args:
            G: A networkx DiGraph object.
            data: A pandas dataframe.
        """

        if not isinstance(G, nx.DiGraph):
            raise TypeError("G must be a networkx DiGraph")    

        if not isinstance(data, pd.DataFrame):
            raise TypeError("data must be a pandas DataFrame.")

        self.causal_model = gcm.StructuralCausalModel(G)
        self.graph = G

        train_test_data, self.causal_data = train_test_split(data)
        self.train_data, self.test_data = train_test_split(train_test_data, test_size=0.5)
                
        
        # Default to the auto assigned mechanisms.
        nodes = list(self.causal_model.graph.nodes)
        gcm.auto.assign_causal_mechanisms(self.causal_model, data[nodes].dropna())

        # nodes where a functional form has been specified
        model_nodes = [n for n in nodes if 'model' in G.nodes[n]]
        for n in model_nodes:
            # get the sklearn class instance
            module = G.nodes[n]['model']['module']
            classname = G.nodes[n]['model']['label']
            params = G.nodes[n]['model']['params']
            sklearn_class = get_instance(module, classname)
            
            # wrap in the dowhy sklearn wrapper class
            model = SklearnRegressionModel(sklearn_class(**params)) \
                    if is_regressor(sklearn_class) \
                    else SklearnClassificationModel(sklearn_class(**params))
        
            # set the causal mechanism with the specified sklearn class
            if is_numeric_dtype(data[n]):
                self.causal_model.set_causal_mechanism(n, AdditiveNoiseModel(model))
            else:
                self.causal_model.set_causal_mechanism(n, ClassifierFCM(model))
                    
        gcm.fit(self.causal_model, self.train_data[nodes].dropna())
        
    
    def __shielded_confounder(self, data, source_node, target_node):
        """ Gets the noise terms when the edge source_node --> target_node is in the graph. 
      
        Args:
            data: A pandas dataframe.
            source_node: Name of the source node in the graph.
            target_node: Name of the target node in the graph.
    
        Returns:
            A tuple containing the source_noise, target_noise
        """
    
        source_parents = get_ordered_predecessors(self.causal_model.graph, source_node)
        target_parents = get_ordered_predecessors(self.causal_model.graph, target_node)

        if source_parents:       
            source_hat = _predict_from_causal(self.causal_model.causal_mechanism(source_node),
                                               data[source_parents])
        else:
            source_hat = _default_prediction(data[source_node])

        # We need to fit the target model with the predicted source_node values
        # since o.w. the model will capture variation due to the unobserved confounder.
        X_t = data[target_parents].copy()
        if isinstance(source_hat, pd.DataFrame):
            X_t.loc[:, source_node] = source_hat.idxmax(axis=1)
        else:
            X_t.loc[:, source_node] = source_hat

        target_model = _fit_to_causal(self.causal_model.causal_mechanism(target_node),
                                       X_t, data[target_node])

        target_hat = _predict_from_model(target_model, data[target_parents],
                                          is_classifier=hasattr(self.causal_model \
                                                                .causal_mechanism(target_node),
                                                                'classifier_model'))
        source_noise = _noise_term(data[source_node], source_hat)
        target_noise = _noise_term(data[target_node], target_hat)
    
        return source_noise, target_noise

    
    def __unshielded_confounder(self, data, source_node, target_node):
        """ Gets the noise terms when the edge source_node --> target_node is NOT in the graph. 
      
        Args:
            data: A pandas dataframe.
            source_node: Name of the source node in the graph.
            target_node: Name of the target node in the graph.
    
        Returns:
            A tuple containing the source_noise, target_noise
        """
        source_parents = get_ordered_predecessors(self.causal_model.graph, source_node)
        target_parents = get_ordered_predecessors(self.causal_model.graph, target_node)
    
        if source_parents:
            source_hat = _predict_from_causal(self.causal_model.causal_mechanism(source_node),
                                              data[source_parents])               
        else:
            source_hat = _default_prediction(data[source_node])
         
        if target_parents:
            target_hat = _predict_from_causal(self.causal_model.causal_mechanism(target_node),
                                              data[target_parents])
        else:
            target_hat = _default_prediction(data[target_node])

        source_noise = _noise_term(data[source_node], source_hat)
        target_noise = _noise_term(data[target_node], target_hat)
        
        return source_noise, target_noise

    @log_it
    def unobserved_confounders(self, source_node, target_node, alpha=0.05):
        """ Identifies potential unobserved confounders between source and target nodes 
        in the causal graph.
    
        Args:
            source_node: Name of the source node in the graph.
            target_node: Name of the target node in the graph.

        Returns:
            List of dicts containing a potential unobserved confounder in descending
        order of likelihood based on correlation of the noise terms.
        """

        if any(nx.simple_cycles(self.causal_model.graph)):
            raise ValueError("The causal graph contains a cycle.")
    
        if (target_node, source_node) in self.causal_model.graph.edges:  # reverse the orientation
            return self.unobserved_confounders(target_node, source_node)

        data = self.causal_data.dropna(subset=self.causal_model.graph.nodes).reset_index()
    
        # select the appropriate confounder function
        conf_fun = self.__shielded_confounder \
                   if (source_node, target_node) in self.causal_model.graph.edges \
                   else self.__unshielded_confounder
    
        sn, tn = conf_fun(data, source_node, target_node)
    
        # check if noise terms are correlated
        rho, pval, adj_alpha = _correlation(sn, tn, alpha)
        if pval >= alpha:
            return []  # no confounders

        source_des = nx.descendants(self.causal_model.graph, source_node)
        target_des = nx.descendants(self.causal_model.graph, target_node)
        columns = [c for c in data.columns if c not in [source_node, target_node,
                                                        *source_des, *target_des]]
        confounders = []
        for c in columns:
            if (c, source_node) in self.causal_model.graph.edges \
               and (c, target_node) in self.causal_model.graph.edges:
                # already a confounder
                continue
        
            not_na = data[c].notnull()

            if is_numeric_dtype(data[c]) or isinstance(sn, pd.DataFrame):
                srho, sp, alpha_sp = _correlation(sn[not_na], data.loc[not_na, c].to_numpy(),
                                                  alpha)
            else:
                srho, sp = _anova(sn[not_na], data.loc[not_na, c].to_numpy())
                alpha_sp = alpha

            if is_numeric_dtype(data[c]) or isinstance(tn, pd.DataFrame):
                trho, tp, alpha_tp = _correlation(tn[not_na], data.loc[not_na, c].to_numpy(),
                                                  alpha)
            else:          
                trho, tp = _anova(tn[not_na], data.loc[not_na, c].to_numpy())
                alpha_tp = alpha
            
            
            if sp >= alpha_sp or tp >= alpha_tp:
                continue

            if np.isnan(sp) and np.isnan(tp):
                continue

            # set pval as the average of p-values
            pval = 0.5 * (sp + tp)
        
            if np.isnan(pval):  # one of sp or tp is nan
                pval = sp if np.isnan(tp) else tp
            
            confounders.append({
                'name': c,
                'score': 0.5 * (abs(srho) + abs(trho)),
                'pval': pval
            })

        confounders.sort(key=lambda x: x['score'], reverse=True)
        return confounders

    @log_it
    def causal_effect_estimate(self, treatment, target, alternative,
                               reference, num_samples=1000):
        """ Computes the effect estimate for treatment on target. 
        
        Args:
            treatment: Treatment node.
            target: Target node.
            alternative: Alternative value for treatment.
            reference: Reference value for treatment.
            num_samples: number of samples to draw for estimate.

        Returns:
            Average treatment effect
        """
        ate, ci = gcm.confidence_intervals(
            gcm.bootstrap_sampling(
                gcm.average_causal_effect,
                self.causal_model,
                target,
                interventions_alternative={treatment: lambda x: alternative},
                interventions_reference={treatment: lambda x: reference},
                num_samples_to_draw=num_samples
            )
        )

        return ate[0], ci[0].tolist()

    def interventional_effect_estimate(self, treatment, alternative,
                                       reference=None, num_samples=1000):
        """ Computes the effect estimate for treatment on successors. 
        
        Args:
            treatment: Treatment node.
            target: Target node.
            alternative: Alternative value for treatment.
            reference: Reference value for treatment.
            num_samples: number of samples to draw for estimate.

        Returns:
            Average treatment effect
        """

        successors = list(nx.dfs_tree(self.causal_model.graph, treatment))[1:]

        def intervention():
            """ Wrapper for computing interventions. """
            samples_0 = gcm.interventional_samples(
                self.causal_model,
                {treatment: lambda x: x if reference is None else reference},
                num_samples_to_draw=num_samples)[successors]
            
            samples_1 = gcm.interventional_samples(
                self.causal_model,
                {treatment: lambda x: x + float(alternative) if reference is None else alternative},
                num_samples_to_draw=num_samples)[successors]
            
            return samples_1.mean() - samples_0.mean()


        ate, ci = gcm.confidence_intervals(
            gcm.bootstrap_sampling(intervention)
        )

        # nominal attributes aren't included in the ate calculation
        # get only the attributes where ate was computed
        ate_succ = intervention().index.tolist()  
        
        return {s: [ate[i], ci[i].tolist()] for i, s in enumerate(ate_succ)}    

                
    @log_it
    def target_edge_strength(self, target):
        """ Compute the edge strengths for predecessors of target.
    
        Args:
            target: Target node.
    
        Returns:
            Mapping from predecessor to causal impact.
        """

        if not self.causal_model.graph.in_edges(target):
            # no incoming edges
            return {}
        
        if is_numeric_dtype(self.causal_data[target]):
            raw_strength = gcm.arrow_strength(self.causal_model, target)                       
            tot_var = self.causal_data[target].var()                        
            return {k[0]: v / tot_var for k, v in raw_strength.items()}

        
        # target is categorical        

        def estimate_normalized_kl_divergence_of_probabilities(X, Y):
            """ Estimates the Kullback-Leibler divergence between each
            pair of probability vectors (row wise) in X and Y
            separately, normalizes by the entropy of X and returns the mean over all results. """
            X, Y = shape_into_2d(X, Y)
            EPS = gcm.constant.EPS
            
            if X.shape[1] != Y.shape[1]:
                raise RuntimeError(('Samples from X and Y need to have the same dimension, '
                                    +'but X has dimension %d and Y has ' \
                                    'dimension %d.') % (X.shape[1], Y.shape[1]))

            kl = entropy(X + EPS, Y + EPS, axis=1)
            ent = entropy(X+EPS, axis=1)
            return float(np.mean( kl/ (kl+ent)))
        
        raw_strength = gcm.arrow_strength(self.causal_model, target,
                                          difference_estimation_func=estimate_normalized_kl_divergence_of_probabilities)
        return {k[0]: v for k, v in raw_strength.items()}

    @log_it
    def intrinsic_influence(self, target):
        """ Computes the intrinsic influence of predecessors on the target. 

        Args: 
            target: Target node.

        Returns:
            Dict mapping predecessors to the influence value.
        """
        influence = gcm.intrinsic_causal_influence(self.causal_model, target)
        total_var = sum(influence.values())
        return {k: v / total_var for k, v in influence.items()}

    @log_it
    def score(self, target):
        """ Computes the level of fit for a target node. 

        Args:
            target: Target node to get the fit score.

        Returns:
            A value between 0 and 1 indicating the level of fit.
        """
        predecessors = get_ordered_predecessors(self.causal_model.graph, target)
        if not predecessors:
            # target is exogeneous
            return 0.0
        
        X = self.test_data[predecessors].values
        y = self.test_data[target].values

        one_hot_encoders = fit_one_hot_encoders(X)
        X = apply_one_hot_encoding(X, one_hot_encoders)

        mechanism = self.causal_model.causal_mechanism(target)
        
        if hasattr(mechanism, 'prediction_model'):
            # regression model
            return mechanism.prediction_model.sklearn_model.score(X, y)

        # classification model
        return mechanism.classifier_model.sklearn_model.score(X, y)
        
        
def _anova(numv, catv):
    """ Computes oneway anova test between categorical and continuous vectors.

    Args:
        numv: Numerical vector.
        catv: Categorical vector.

    Returns:
        R^2 and pvalue.
    """
    data = pd.DataFrame({'numv': numv, 'catv': catv})

    n = data.shape[0]
    p = data['catv'].nunique()

    if p <= 1:
        return 0., 1.

    groups = [g['numv'] for k, g in data.groupby('catv')]

    F, pval = f_oneway(*groups) if len(groups) > 1 and max(len(g) for g in groups) > 1 \
              else (0, np.nan)
    if np.isnan(pval):
        # this can occur if each group only has one value in it
        r2, pval = 0, 1
    else:
        # get the R^2 value from F-statistic
        r2 = 1 - (1 + F * ((p-1)/(n-p)))**-1

    return r2, pval

    
def _correlation(v1, v2, alpha=0.05, display=False):
    """ Gets the (possibly best) correlation and p value 
    between v1 and v2. 
    
    Args:
        v1: numpy ndarray to correlate.
        v2: numpy ndarray to correlate.
        alpha: Significance level
    Returns:
        correlation, pvalue, corrected alpha
    """
    if len(v1.shape) == 1:
        v1 = v1[:, np.newaxis]

    if len(v2.shape) == 1:
        v2 = v2[:, np.newaxis]

    if v1.shape[1] == v2.shape[1] == 1:
        return (*spearmanr(v1, v2), alpha)

    if not isinstance(v1, pd.DataFrame) and isinstance(v2, pd.DataFrame):
        return _correlation(v2, v1)  # ensure a consistent ordering

    if not isinstance(v2, pd.DataFrame):
        v2 = pd.DataFrame(v2, columns=['__res_'])

    
    # don't alter the original dataframe
    v1 = v1.copy()
    v1_bin_cols = [c for c in v1.columns if '__bin_' in c]

    v2_res_cols = [c for c in v2.columns if '__res_' in c]
    
    v1[[f'tst_{c}' for c in v2_res_cols]] = v2[v2_res_cols]

    best_rho_p = (0, np.inf)
    for cbin in v1_bin_cols:
        cls = cbin[len('__bin_'):]
        grouped = v1.groupby(cbin)

        avg_res = grouped[f'__res_{cls}'].mean()

        # get the best correlation / p-value
        for ctst in v2_res_cols:
            if is_numeric_dtype(v1[f'tst_{ctst}']):
                rho, pval = spearmanr(avg_res, grouped[f'tst_{ctst}'].mean())
            else:  # use anova
                rho, pval = _anova(v1[f'__res_{cls}'], v1[f'tst_{ctst}'])
                
            if abs(rho) > abs(best_rho_p[0]):
                best_rho_p = (rho, pval)

    # bonferroni correction
    adj_alpha = alpha / (len(v1_bin_cols) * len(v2_res_cols))
    return (*best_rho_p, adj_alpha)

    
def _predict_from_model(model, X, is_classifier=False):
    """ Produces predictions from a pre-trained model. 
    
    Args:
        model: Model to predict from.
        X: Predictor matrix.
        is_classifier: True if model is a classifier, False o.w.

    Returns:
        Vector of predictions if regressor, matrix of probabilities o.w.
    """
    model_ = model.sklearn_model
    if is_classifier:
        classes = model_.classes_        
        return pd.DataFrame(model.predict_probabilities(X.to_numpy()), columns=classes)        

    return model.predict(X.to_numpy()).flatten()


def _predict_from_causal(cm, X):
    """ Gets the predictions based on the causal mechanism. 

    Args:
        cm: Causal mechanism.
        X: Matrix of predictors.

    Returns:
        Array of predictions.
    """
    if hasattr(cm, 'prediction_model'):
        # cm is a regressor
        return _predict_from_model(cm.prediction_model, X, is_classifier=False)
    
    # cm is a classifier
    return _predict_from_model(cm.classifier_model, X, is_classifier=True)


def _fit_to_causal(cm, X, y):
    """ Trains the model associated with the causal mechanism. 

    Args:
        cm: Causal mechanism.
        X: Predictors.
        y: Target.
    
    Returns:
        The fitted model.
    """
    model = cm.prediction_model.clone() if hasattr(cm, 'prediction_model') \
            else cm.classifier_model.clone()

    model.fit(X=X.to_numpy(), Y=y.to_numpy())
    return model
    

def _default_prediction(y):
    """ Returns the default prediction (i.e. mean for regressor, most 
    frequent class for classifier) """

    if is_numeric_dtype(y):
        return np.array([y.mean()] * y.shape[0])

    # classifier
    classes = y.unique()

    # model the default prediction with a gaussian near 0 and 1 
    # this helps to avoid issues with binning later on.
    pred_df = pd.DataFrame(np.random.normal(loc=0.1, scale=0.05,
                                            size=(y.shape[0], len(classes))).clip(0, 1),
                           columns=classes)
    
    pred_df[y.value_counts().index[0]] =  np.random.normal(loc=0.9, scale=0.05, size=y.shape[0]) \
                                                   .clip(0,1)
    return pred_df


def _noise_term(y, y_hat):
    """ Returns the (possibly multidimensional) noise / error term. """
    if is_numeric_dtype(y):
        return y.to_numpy() - y_hat

    binned = pd.DataFrame()

    for cls in y.unique():
        pr = y_hat[cls]
        res = (y==cls).astype(int) - pr
        
        # bin the residuals
        if res.nunique() > 30:
            binned[f'__bin_{cls}'] = pd.qcut(res, 30, labels=False, duplicates='drop')
        else:
            binned[f'__bin_{cls}'] = res

        binned[f'__res_{cls}'] = res
        
    return binned
    
    
    
    
