import React from 'react';
import * as redux from 'react-redux'

import { Config, LOAD_FILE } from "../components/Config"

import {render, screen, fireEvent } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

window.setImmediate = window.setTimeout;

describe("config panel", () => {
  it('should test the initial state', ()=>{
    render(<Config />);
    expect(screen.getByTestId("container").textContent).toBe("");

    // no table from load config
    expect(screen.queryByTestId('rawPreview')).toBeNull();
  });  

  it('should test the load action config when there are config params.', ()=>{
    const rawPreview = [
      "'c1': 1, 'c2': 2, 'c3': 3",
      "'c1': 2, 'c2': 3, 'c3': 4",
      "'c1': 3, 'c2': 4, 'c3': 5",
    ];

    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);
    
    const setOutput = jest.fn();
    const setIsLoading = jest.fn();
    
    const node = {'type': LOAD_FILE, config: {file: null, rawPreview: rawPreview}};

    const spy = jest.spyOn(redux, 'useSelector')
    spy.mockReturnValue({ pipelineName:'test' })

    render(<Config focusNode={node} pathTo={pathToMock} setOutput={setOutput}
	   setIsLoading={setIsLoading}/>);

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
    
    // table should be there
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('rawPreview')).toBeTruthy();
  });  

  
  it('should test the load action config when there are no params.', ()=>{
    const preview = [
      {'c1': 1, 'c2': 2, 'c3': 3},
      {'c1': 2, 'c2': 3, 'c3': 4},
      {'c1': 3, 'c2': 4, 'c3': 5},
    ];
    
    const node = {'type': LOAD_FILE, config: {inMemory: false}};

    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);
    
    const setOutput = jest.fn();
    const setIsLoading = jest.fn();

    const spy = jest.spyOn(redux, 'useSelector')
    spy.mockReturnValue({ pipelineName:'test' })

    render(<Config focusNode={node} pathTo={pathToMock} setOutput={setOutput}
	   setIsLoading={setIsLoading}/>);

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
    
    // raw preview should be there
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('rawPreview')).toBeNull();
  });  

  it('should test the reset load action config.', ()=>{
    const preview = [
      {'c1': 1, 'c2': 2, 'c3': 3},
      {'c1': 2, 'c2': 3, 'c3': 4},
      {'c1': 3, 'c2': 4, 'c3': 5},
    ];

    const node = {
      'type': LOAD_FILE, 
      ID: 0,
      config: {        
        name: 'foo.txt',
        path: './foo.txt',
        isAvailable: true,
        options:{
          encoding: 'utf_8',
          delim: ",",
          lineDelim: "",
          headerRow: 0,          
          startLine: 0,  
          escapechar: "",
          comment: "",
          thousands: "",
          decimal: ".",        
          skipEmpty: true,
          naOptions: []
        },
        rawPreview: ['c1, c2, c3', '1, 2, 3', '2, 3, 4', '3, 4, 5'],
        columns: ['c1', 'c2', 'c3'],
        preview: preview
      },
      output: {
        name: 'foo.txt',
        path: './foo.txt',
        columns: ['c1', 'c2', 'c3'],
        preview: preview
      }
    };
    
    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);

    const setParams = (id, params) => {
      expect(id).toBe(0);
      expect(params).toEqual({
        isAvailable: false,
	inMemory: true,
        options:{
          encoding: 'utf_8',
          delim: ",",
          lineDelim: "",
          headerRow: 0,          
          startLine: 0,  
          escapechar: "",
          comment: "",
          thousands: "",
          decimal: ".",        
          skipEmpty: true,
          naOptions: []
        }
      });
    };

    const setOutput = (id, params) => {
      expect(id).toBe(0);
      expect(params.length).toBe(1);
      expect(params[0]).toBeNull();
    };

    const setIsLoading = jest.fn();

    const spy = jest.spyOn(redux, 'useSelector')
    spy.mockReturnValue({ pipelineName:'test' })
    
    render(<Config focusNode={node} pathTo={pathToMock} setParams={setParams}
	   setOutput={setOutput} setIsLoading={setIsLoading}/>);

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
    
    // raw input should be there
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('rawPreview')).not.toBeNull();
    userEvent.click(screen.getByText('Reset'));    
  }); 
});
