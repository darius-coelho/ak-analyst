import React from 'react';
import { HashRouter } from 'react-router-dom';

// Note the default export is connected to redux store.
import Config, { LOAD_FILE, CLEANSE, JOIN } from "../components/Config"
import { createFileOutput, FILE } from '../../graph/components/Action.prototype';

import { createTestStore } from '../../store';
import { Provider } from 'react-redux';

import { addNode, addEdge, clearFocus,
	 setOutput, setConfig, setNodeFocus } from '../../graph/graph.actions';

import {render, screen, cleanup } from "@testing-library/react";

import userEvent from '@testing-library/user-event';
import * as axios from "axios";
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup';

jest.mock("axios");
jest.mock('mixpanel-browser');

window.setImmediate = window.setTimeout;

let store;
describe("config integeration test", () => {
  window.alert = jest.fn();
  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(cleanup);

  it("should update the config panel on redux change", ()=>{
    render(<Provider store={store}> <Config /> </Provider>);
    // Should be empty initially
    expect(screen.queryByTestId('fileInput')).toBeNull(); 
    
    
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 0, y: 0}, config: null}));
    
    // Expect the configuration to load the LoadAction config.
    expect(screen.queryByTestId('fileInput')).toBeTruthy();

    const preview = [
      {'a': 1, 'b': 2, 'b': 3},
    ];
    
    // set config parameters
    store.dispatch(setConfig(0, {name: "file1.csv", path: "data\file1.csv", preview: preview}));

    // The preview table should have loaded
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    
    // clear focus
    store.dispatch(clearFocus());

    // Should be null again
    expect(screen.queryByTestId('fileInput')).toBeNull();

    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 10, y: 0}, config: null}));

    // Expect the configuration to load the LoadAction config.
    expect(screen.queryByTestId('fileInput')).toBeTruthy();

    // set the node focus back to 0
    store.dispatch(setNodeFocus([0]));
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
  });

  
  it("should update the config panel on file upload", ()=>{
    render(<Provider store={store}> <Config /> </Provider>);

    // Should be empty initially
    expect(screen.queryByTestId('fileInput')).toBeNull();    
    
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 0, y: 0}, config: null}));
    
    // Expect the configuration to load the LoadAction config.
    expect(screen.queryByTestId('fileInput')).toBeTruthy();


    const preview = [
      {'c1': 1, 'c2': 2, 'c3': 3},
      {'c1': 2, 'c2': 3, 'c3': 4},
      {'c1': 3, 'c2': 4, 'c3': 5},
    ];
    
    axios.post.mockResolvedValueOnce({
      data: {
        outputList: [ 
          {
            name: 'foo.txt',
            path: './foo.txt',
            columns: ['c1', 'c2', 'c3'],
            preview: preview
          }
        ]
      }
    });

    const fileInput = screen.getByTestId("fileInput");
    
    const file = new File(["foo"], "foo.txt", {type: "text/plain",});    
    let prom = new Promise(function(myResolve, myReject) {
      userEvent.upload(fileInput, file);

      // Hacky way of dealing with the async nature of
      // uploading a file to trigger a the setConfig redux
      // action.
      setTimeout(()=>myResolve('OK'), 500);
    });

    expect(fileInput.files[0]).toStrictEqual(file)
    prom.then(()=>{      
      // The preview table should have loaded
      expect(screen.queryByTestId('fileInput')).toBeTruthy();
    });
    
    return prom;
  })

  
  it('should test CleanseAction state', ()=>{
    render(<HashRouter><Provider store={store}> <Config />  </ Provider></HashRouter>);

    // Should be empty initially
    expect(screen.queryByTestId('fileInput')).toBeNull();    

    const file = {
      name: 'file1.csv',
      path: './file1.csv',
      columns: ['a', 'b'],
      preview: [{'a': 1, 'b': 2}],
    };

    const file1 = {
      name: "file1.csv",
      isAvailable: true,
      path: "data/file1.csv",
      lastModified: null,
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };    
    
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 0, y: 0}, config: null}));
    store.dispatch(setConfig(0, file1));
    store.dispatch(setOutput(0, [createFileOutput(file)]));
    
    store.dispatch(addNode({type: CLEANSE, pos: {x: 0, y: 0}, config: null}));
    store.dispatch(addEdge({src: 0, srcPort: 0, dst: 1, dstPort: 0}));
        
    store.dispatch(setNodeFocus([1]));

    expect(screen.queryByText("Launch Data Transformer")).toBeTruthy();
    expect(screen.queryByText("Sample Options")).toBeTruthy();
    expect(screen.queryByText("Use Sample")).toBeTruthy();

    const expected = {
      transformations: [],
      deleted: [],
      options: {
	is_sample: true,
	nsamples: 1000
      }
    };    

    expect(store.getState().graph.nodes[1].config).toEqual(expected);
    userEvent.click(screen.getByRole("checkbox"));
    
    // is_sample should be false
    expect(store.getState().graph.nodes[1].config.options.is_sample).toBe(false);

    // re-enable sampling
    userEvent.click(screen.getByRole("checkbox"));
    userEvent.type(screen.getByTestId("num-samples"), "2000");
    

    expect(store.getState().graph.nodes[1].config.options.is_sample).toBe(true);
    expect(store.getState().graph.nodes[1].config.options.nsamples).toBe(10002000);       

    // clear focus
    store.dispatch(clearFocus());
    
    // Should be null again
    expect(screen.queryByTestId('fileInput')).toBeNull();

    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 10, y: 0}, config: null}));

    // Expect the configuration to load the LoadAction config.
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByText("Launch Data Transformer")).toBeNull();
    
    // set the node focus back to 0
    store.dispatch(setNodeFocus([1]));
    
    expect(screen.queryByTestId("cleanseButton")).toBeTruthy();
    expect(screen.queryByText("Launch Data Transformer")).toBeTruthy();
  });
  window.alert.mockClear();
});
