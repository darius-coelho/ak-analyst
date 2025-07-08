import { createStore, combineReducers, applyMiddleware } from 'redux'
import { graphReducer } from "./graph/graph.reducer"
import { globalReducer } from "./global/global.reducer"

import * as graphActions from './graph/graph.actions';
import { setAutoSaveName, setIsSaved } from './global/global.actions';

import api from '../../apis/api';

const allReducer = combineReducers({
  global: globalReducer,
  graph: graphReducer
});

function isSaveableAction(type) {
  if (!type.includes("graph/")) {
    return false;
  }

  // exclude certain graph actions
  const exclude = [
    graphActions.SET_NODE_FOCUS,
    graphActions.SET_EDGE_FOCUS,
    graphActions.SET_NOTE_FOCUS,
    graphActions.CLEAR_FOCUS,
    graphActions.COPY_FOCUS,
    graphActions.SET_IS_LOADING,
    graphActions.HANDLE_NODE_ERROR,
    graphActions.SET_STATE_FROM_FILE,
    graphActions.SET_FILE_AVAILABLE,
    graphActions.RESET_STATE
  ];
  
  return !exclude.includes(type);
}


/** Middleware for handling autosaving when certain changes are made to the redux state. */
function autoSave({ getState, dispatch }) {
  return next => action => {
    const returnVal = next(action);

    const curState = getState();
    if (curState.global.isSample || !isSaveableAction(action.type)) {
      return returnVal;
    }

    const oldName = curState.global.autoSaveName;
    const newName = `autosave_${curState.global.pipelineName}_${Date.now()}.aka`;
    dispatch(setAutoSaveName(newName));
    dispatch(setIsSaved(false));  // there exists unsaved changes
    
    // auto-save the file
    api.saveFile("Pipelines", {filename: newName, oldName: oldName},
		 JSON.stringify(curState), ()=>{
		   
		   if (getState().global.autoSaveName !== newName) {
		     // This autosave has been overwritten
		     api.deleteFile('Pipelines', newName, ()=>{}, (err)=>console.error(err));
		   }
		 }, (err)=>console.error(err));
    
    return returnVal;
  }
}

export const store = createStore(allReducer, applyMiddleware(autoSave));

// Helper function for unit testing with redux-store.
export function createTestStore() {
  const testStore = createStore(allReducer);
  return testStore;
};

export default store
