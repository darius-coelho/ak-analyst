import numpy as np
import pandas as pd


def to_delayed_op(val, *args, **kwargs):
    """ Converts to a delayed op iff it is not already a delayed op. """
    if isinstance(val, DelayedOp):
        return val
    
    return DelayedOp(val, *args, **kwargs)

class DelayedOp:
    """ Class for queing ops to be executed at sometime in the future."""
    def __init__(self, fun, *args, **kwargs):
        """ Constructor for the DelayedOp class. 

        Args:
            fun: Operation (possibly a function) to be executed.
            args: Args to be passed when executing fun
            kwargs: Keyword args to be passed when executing fun.
        
        """
        self.fun = fun
        self.args = args
        self.kwargs = kwargs
        
        self.is_callable = False
        self.call_args = None
        self.call_kwargs = None

        # list of setitem type operations to be executed
        # e.g. df['eps'] = df['eps'] + 1
        self._set_stack = []
       
        
    def __getattr__(self, field):               
        return DelayedOp(getattr, self, field)
    
    def __getitem__(self, arg):
        if isinstance(arg, tuple):
            args = (to_delayed_op(a) for a in arg)
            result = DelayedOp(lambda x, *a: x[a], self, *args)
            return result
        

        return DelayedOp(lambda x, a: x[a], self, to_delayed_op(arg))
   
    def __setitem__(self, arg, val):
        self._set_stack.append(DelayedOp('__setitem__', to_delayed_op(arg), to_delayed_op(val)))
                                                     
        
    def __call__(self, *args, **kwargs):        
        result = DelayedOp(self.fun, *self.args, **self.kwargs)
        result.is_callable = True
        result.call_args = [to_delayed_op(a) for a in args]
        result.call_kwargs = {k: to_delayed_op(v) for k, v in kwargs.items()}
        return result
    
    def __add__(self, other):
        return DelayedOp(lambda x, y: x + y, self, to_delayed_op(other))

    def __radd__(self, other):
        return self + other

    def __mul__(self, other):
        return DelayedOp(lambda x, y: x * y, self, to_delayed_op(other))

    def __rmul__(self, other):
        return DelayedOp(lambda x, y: y * x, self, to_delayed_op(other))

    def __sub__(self, other):
        return DelayedOp(lambda x, y: x - y, self, to_delayed_op(other))

    def __rsub__(self, other):
        return DelayedOp(lambda x, y: y - x, self, to_delayed_op(other))

    def __truediv__(self, other):
        return DelayedOp(lambda x, y: x / y, self, to_delayed_op(other))

    def __rtruediv__(self, other):
        return DelayedOp(lambda x, y: y / x, self, to_delayed_op(other))
    
    def __eq__(self, other):
        return DelayedOp(lambda x, y: x == y, self, to_delayed_op(other))        

    def __ne__(self, other):
        return DelayedOp(lambda x, y: x != y, self, to_delayed_op(other))

    
    def __gt__(self, other):
        return DelayedOp(lambda x, y: x > y, self, to_delayed_op(other))
    
    def __ge__(self, other):
        return DelayedOp(lambda x, y: x >= y, self, to_delayed_op(other))        

    def __lt__(self, other):
        return DelayedOp(lambda x, y: x < y, self, to_delayed_op(other))

    def __le__(self, other):
        return DelayedOp(lambda x, y: x <= y, self, to_delayed_op(other))   

    def __and__(self, other):
        return DelayedOp(lambda x, y: x & y, self, to_delayed_op(other))   

    def __or__(self, other):
        return DelayedOp(lambda x, y: x | y, self, to_delayed_op(other))   

    def __invert__(self):
        return DelayedOp(lambda x: ~x, self)
        
    def _execute(self, preview=None):
        if not callable(self.fun) or not self.args:
            if preview is None or not hasattr(self.fun, preview['method']):
                return self.fun

            # preview by sampling and running all of the operations on the sample
            if preview['method'] == 'sample':
                return getattr(self.fun, preview['method'])(n=preview['n'], frac=preview['frac'])

            return getattr(self.fun, preview['method'])(n=preview['n'])
            

        def propagate_arg_calls(a):
            if isinstance(a, self.__class__):
                return a.execute(preview)
                        
            return a
        
        args = list(propagate_arg_calls(a) for a in self.args)
        result = self.fun(*args, **self.kwargs)        
        if self.is_callable:
            call_args = (propagate_arg_calls(a) for a in self.call_args)
            call_kwargs = {k: propagate_arg_calls(v) for k, v in self.call_kwargs.items()}
            return result(*call_args, **call_kwargs)

        return result
        
    
    def execute(self, preview=None):
        """ Recursively executes all of the delayed operations. 
        
        Args:
            preview: Contains arguments for pre-sampling.
        """
        result = self._execute(preview)
        if preview is None:
            self.fun = result

        copy_stack = [*self._set_stack]
        while self._set_stack:
            op = self._set_stack.pop(0)
            result = result
            
            arg = op.args[0].execute(preview)
            val = op.args[1].execute(preview)
            result[arg] = val

        if preview is not None:
            self._set_stack = copy_stack

        return result

    
    def preview(self, n=None, frac=None, method='sample'):
        """ Runs the sequence of delayed ops on a sampled dataframe. 

        Args:
            n: Number of items to sample.
            frac: Fraction of items to sample (exclusive w.r.t n)
            method: Method of sampling ('sample', 'head', 'tail')

        Returns:
            The previewed dataframe.
        """        
        return self.execute(preview=dict(n=n, frac=frac, method=method))
        
    
class DelayDataFrame(DelayedOp):
    def __init__(self, df):
        """ Constructor for the delay dataframe. """

        # perform everything on a copy of the data.
        super().__init__(df.copy())
    
