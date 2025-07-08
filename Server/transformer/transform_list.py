from copy import deepcopy

import transformer.transform as tr
from ak_logger import logger, log_it

class TransformList:
    """ Creates and manages the list of transforms to apply in the 
    order the user has specified. Internally we represent this as a network to 
    account for potentially complex chains of dependencies. """

    # Dict mapping the transform string to the transform class.
    str_to_class = {
        'Dtype': tr.TypeTransform,
        'OrdinalOrder': tr.OrderingTransform,
        'Log': tr.LogTransform,
        'ColNameChange': tr.RenameTransform,
        'Norm': tr.NormTransform,
        'Clamp': tr.ClampTransform,
        'Repl': tr.ReplaceTransform,
        'Missing': tr.ImputeTransform,
        'Missing-Drop': tr.DropMissing,
        'Filter': tr.FilterTransform,        
        'FilterNom': tr.NominalFilterTransform,
        'FilterDate': tr.FilterDateTransform,
        'CellSplit': tr.CellSplitTransform,
        'OHE': tr.OHETransform,
        'Rank': tr.RankTransform,
        'Custom': tr.CustomTransform,
        'Derived': tr.CreateDerivedTransform        
    }

    @log_it
    def __init__(self, transformations=[]):
        """ Constructor for the Transform list class. """
        # list of transforms to apply
        self.transform_list = []

        # adjacency list mapping ID to immediate dependencies
        self.adjacency_list = {}

        # list of rename transformations
        self.rename_list = []

        # Latest uid of applied transform
        self.last_uid = None
        

    def __len__(self):
        """ Returns the number of all transformation types. """
        return len(self.transform_list) + len(self.rename_list)
                   
    @log_it            
    def find_key(self, attr, start_id=None):
        """ Finds the unique ID associated with the latest transform on attr.
        
        Args:
            attr: Attribute to find.
            start_id: If set, only find keys prior to start_id in transform_list.
        
        Returns:
            The unique id or None if no transform on attr is found.
        """
        start_id_index = -1
        if start_id is not None:
            if not self.transform_list or self.transform_list[0].uid == start_id:
                return None  # no possible dependency
            
            # get the index of the start id in the transform list
            try:
                start_id_index = [t.uid for t in self.transform_list].index(start_id) - 1
            except:
                # The start_id is not in the list
                start_id_index = -1
                                    
        # traverse the list in reverse order up to the start_id
        return next((tform.uid for tform in self.transform_list[start_id_index::-1] \
                     if tform.attr == attr), None)

    
    @log_it
    def get_transform_by_id(self, uid):
        """ Returns the transform associated with uid or None if it doesn't exist. """
        return next((tform for tform in self.transform_list if tform.uid == uid), None)

    @log_it    
    def disable(self, uid):
        """ Disable the transform associated with uid and all its dependencies.
        
        Args:
            uid: ID of transform to disable.
        """        
        self.get_transform_by_id(uid).disable()
        for dep_id in self.adjacency_list[uid]:
            self.disable(dep_id)

    @log_it                
    def delete(self, uid):
        """ Removes the transform associated with uid from the list and 
        disables all its dependencies.

        Args:
            uid: ID of transform to delete.
        """
        self.disable(uid)
        
        self.transform_list = [t for t in self.transform_list if t.uid != uid]        
        del self.adjacency_list[uid]

        # remove all instances of uid in adjacency list
        for tid, values in self.adjacency_list.items():
            self.adjacency_list[tid] = [nid for nid in values if nid != uid]
        
    @log_it        
    def enable(self, uid):
        """ Enable the transform associated with uid. 
        
        Args:
            uid: ID of transform to enable.
        """
        self.get_transform_by_id(uid).enable()

    @log_it
    def apply_rename_transform(self, data, attr, name, **kwargs):
        """ Applies a column renaming transform. 

        Args:
            data: Data to apply the transform to.
            attr: Attribute to rename.
            name: New attribute name.

        Returns:
            The 'name' attribute name.
        """

        transform = tr.RenameTransform(attr, name)
        transform.apply(data)

        for t in self.transform_list:
            t.rename(attr, name)
            
        # insert the transform list to the front
        self.rename_list.append(transform)

        self.last_uid = transform.uid
        return name


    @log_it    
    def __transitive_dependent_transforms(self, transform):
        """ Get all transforms that uid transitively depends on. 

        Args: 
            uid: Transform ID to find dependencies for.

        Returns:
            List of all the copied transforms (in order) uid dependends on.
        """
        dependent = []

        uid = transform.uid
        for dep in transform.dependency_list:
            dep_id = self.find_key(dep, uid)
            if dep_id is not None:
                dep_transform = self.get_transform_by_id(dep_id)
                dependent.append(deepcopy(dep_transform))
                dependent = self.transitive_dependent_transforms(dep_transform) + dependent
                
        return dependent

    def transitive_dependent_transforms(self, transform):
        """ Get all transforms that uid transitively depends on. 

        Args: 
            uid: Transform ID to find dependencies for.

        Returns:
            List of all the copied transforms (in order) uid dependends on.
        """
        transforms = self.__transitive_dependent_transforms(transform)

        # remove duplicates
        dependent = []
        for tform in transforms:
            if all(tform.uid != t.uid for t in dependent):
                dependent.append(tform)
                
        return dependent
        
    def is_creation_dependent(self, previous, transform):
        """ Adds the dependencies from transforms that result in the creation of
        the transformed attribute.

        Args:
            previous: A previous transform.
            transform: The newly added transform

        Returns:
            True if previous transform creates the attribute in transform. False o.w.
        """
        if isinstance(previous, tr.RankTransform) or isinstance(previous, tr.OHETransform):
            if transform.attr in previous.new_cols:
                return True
        
        return False

    
    @log_it    
    def apply_transform(self, data, info):
        """ Adds a transform to the list, applies it, and updates dependencies. 

        Args:
            data: Data to apply the transform to.
            info: Dict. containing the transform type and necessary info.

        Returns:
            The (possibly renamed) attribute the transform was applied on.
        """
        if not isinstance(info, dict):
            raise TypeError("info should be a python dictionary")

        if 'tType' not in info:
            raise ValueError("info should contain 'tType' indicating the transform type")

        # python destructuring into transform type and args
        transform_type, args = (lambda tType, **rest: (tType, rest))(**info)
    
        if transform_type == 'ColNameChange':
            return self.apply_rename_transform(data, **args)
        
        # Get the class instance representing the appropriate transformation.
        class_inst = TransformList.str_to_class[transform_type]

        transform = class_inst(**args)
        transform.apply(data)

        for dep in transform.dependency_list:
            dep_id = self.find_key(dep)
            if dep_id is not None:
                self.adjacency_list[dep_id].append(transform.uid)

        # check if the transformed attribute is the result of another transform
        for tform in self.transform_list:            
            if self.is_creation_dependent(tform, transform):
                self.adjacency_list[tform.uid].append(transform.uid)
                
        self.transform_list.append(transform)
        self.adjacency_list[transform.uid] = []

        self.last_uid = transform.uid
        return transform.attr
    
    @log_it
    def apply_rename_transforms(self, data):
        """ Applies the list of renamining tranformations. 

        Args:
            data: Data to apply renaming on.
        """
        # perform the renamining transformations
        for transform in self.rename_list:
            transform.apply(data)

    @log_it
    def get_rename_transform(self, col):
        """ Returns the RenameTransform associated with col or 
        None if it doesn't exist. 

        Args:
            col: Column to rename.

        Returns:
            The correct RenameTransform or None.
        """
        return next((t for t in self.rename_list if t.attr == col), None)

    @log_it
    def apply(self, data):
        """ Applies the list of transformations in order 
        
        Args:
            data: Data to apply the transforms on.
        """
        
        self.apply_rename_transforms(data)
                
        for transform in self.transform_list:            
            transform.apply(data)

    @log_it            
    def transformations(self):
        """ Returns a list of the transformations as dicts. """
        transforms = [t.to_dict() for t in self.transform_list]        
        transforms = sorted(transforms, key=lambda d: d['uid'])

        # move rename transforms to the front
        transforms = [t.to_dict() for t in self.rename_list] + transforms
        return transforms

    @log_it    
    def visible_list(self):
        """ Returns a list of the visible transformations as dicts. """
        transforms = self.rename_list + self.transform_list
        return [t.to_dict() for t in transforms if t.is_visible]
