import { createTestStore } from '../../store';
import reducer from '../global.reducer';
import * as actions from '../global.actions';

describe('global reducer',  () => {
  it('should return the initial state', ()=>{
    const expected = {
      pipelineName: '',
      autoSaveName: '',
      isSample: false,
      isSaved: true,
    };
    
    expect(reducer(undefined, {})).toEqual(expected);
  });

  it('should handle SET_PIPELINE_NAME action on initial state', ()=>{
    const setAction = actions.setPipelineName('pipeline_name');
    const expected = {
      pipelineName: 'pipeline_name',
      autoSaveName: '',
      isSample: false,
      isSaved: true,
    };    
    expect(reducer(undefined, setAction)).toEqual(expected);
  });

  it('should handle SET_AUTOSAVE_NAME action on state', ()=>{
    const setName = actions.setPipelineName('pipeline_name');
    const setAutoSaveName = actions.setAutoSaveName('pipeline_name_autosave');
    const expected = {
      pipelineName: 'pipeline_name',
      autoSaveName: 'pipeline_name_autosave',
      isSample: false,
      isSaved: true,
    };    
    const state = reducer(undefined, setName);
    expect(reducer(state, setAutoSaveName)).toEqual(expected);
  });

  
  it('should handle RESET_STATE action', ()=>{
    const setAction = actions.setPipelineName('pipeline_name');
    const resetAction = actions.resetGlobalState('test_name');
    
    const expected = {
      pipelineName: 'pipeline_name',
      autoSaveName: '',
      isSample: false,
      isSaved: true,
    };    
    expect(reducer(undefined, setAction)).toEqual(expected);

    const expectedReset = {
      pipelineName: 'test_name',
      autoSaveName: '',
      isSample: false,
      isSaved: true,  
    };
    expect(reducer(undefined, resetAction)).toEqual(expectedReset);    
  });
  
});
