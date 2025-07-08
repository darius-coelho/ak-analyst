import mixpanel from 'mixpanel-browser';

export const ADD_NODE = 'graph/ADD_NODE';
export const ADD_EDGE = 'graph/ADD_EDGE';
export const ADD_NOTE = 'graph/ADD_NOTE';
export const SET_NODE_POS = 'graph/SET_NODE_POS';
export const SET_NODE_FOCUS = 'graph/SET_NODE_FOCUS';
export const SET_EDGE_FOCUS = 'graph/SET_EDGE_FOCUS';
export const SET_NOTE_FOCUS = 'graph/SET_NOTE_FOCUS';
export const CLEAR_FOCUS = 'graph/CLEAR_FOCUS';
export const DELETE_FOCUS = 'graph/DELETE_FOCUS';
export const COPY_FOCUS = 'graph/COPY_FOCUS';
export const PASTE_FOCUS = 'graph/PASTE_FOCUS';
export const SET_CONFIG = 'graph/SET_CONFIG';
export const SET_OUTPUT = 'graph/SET_OUTPUT';
export const SET_IS_LOADING = 'graph/SET_IS_LOADING';
export const HANDLE_NODE_ERROR = 'graph/HANDLE_NODE_ERROR'
export const SET_NOTE_CONFIG = 'graph/SET_NOTE_CONFIG';
export const SET_FILE_AVAILABLE = 'graph/SET_FILE_AVAILABLE'
export const SET_STATE_FROM_FILE = 'graph/SET_STATE_FROM_FILE';
export const RESET_STATE = 'graph/RESET_STATE';
export const VALIDATE_CURRENT_STATE = 'graph/VALIDATE_CURRENT_STATE';


export const addNode = (node) => {
  mixpanel.track("Add Action", {'type': node.type});
  
  return {
    type: ADD_NODE,
    node
  };
};

export const addEdge = (edge) => {
  return {
    type: ADD_EDGE,
    edge
  };
};

export const addNote = (note) => {
  return {
    type: ADD_NOTE,
    note
  };
};

export const setNodePos = (id, pos) => {
  return {
    type: SET_NODE_POS,
    id,
    pos
  };
};

export const setNodeFocus = (focusList) => {
  return {
    type: SET_NODE_FOCUS,
    focusList
  };
};

export const setEdgeFocus = (focusList) => {
  return {
    type: SET_EDGE_FOCUS,
    focusList
  };
};

export const setNoteFocus = (focusList) => {
  return {
    type: SET_NOTE_FOCUS,
    focusList
  };
};

export const clearFocus = () => {
  return {
    type: CLEAR_FOCUS
  };
};

export const deleteFocus = () => {
  return {
    type: DELETE_FOCUS
  };
};

export const copyFocus = () => {
  return {
    type: COPY_FOCUS
  };
};

export const pasteFocus = () => {
  return {
    type: PASTE_FOCUS
  };
};

export const setConfig = (id, params) => {
  return {
    type: SET_CONFIG,
    id,
    params
  };
};

export const setOutput = (id, output) => {
  return {
    type: SET_OUTPUT,
    id,
    output
  };
};

export const setNoteConfig = (id, params) => {
  return {
    type: SET_NOTE_CONFIG,
    id,
    params
  };
};

export const setIsLoading = (id, status) => {
  return {
    type: SET_IS_LOADING,
    id,
    status
  };
};

export const setIsFileAvailable = (id, isAvailable) => {
  return {
    type: SET_FILE_AVAILABLE,
    id,
    isAvailable
  }
}

export const handleNodeError = (id, action, err) => {
  return {
    type: HANDLE_NODE_ERROR,
    id,
    action,
    err
  };
};

export const setStateFromFile = (state) => {
  return {
    type: SET_STATE_FROM_FILE,
    state
  };
};

export const resetState = () => {
  return {
    type: RESET_STATE,
  };
};

export const validateCurrentState = () => {
  return {
    type: VALIDATE_CURRENT_STATE,    
  };
};
