import React from 'react';
import LoadActionConfig from "../components/LoadActionConfig"

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import * as axios from "axios";

jest.mock("axios");

window.setImmediate = window.setTimeout;

describe("load action config panel", () => {
  afterEach(cleanup);
  
  it('should test the initial state', ()=>{
    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);
    
    render(<LoadActionConfig type={'LOAD_FILE'} config={{inMemory: false}} pathTo={pathToMock}/>);
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('rawPreview')).toBeNull();

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
  });


  it('should test that preview is shown', ()=>{
    const rawPreview = [
      "'c1': 1, 'c2': 2, 'c3': 3",
      "'c1': 2, 'c2': 3, 'c3': 4",
      "'c1': 3, 'c2': 4, 'c3': 5",
    ];

    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);
    
    render(<LoadActionConfig type={'LOAD_FILE'}
	   config={{rawPreview: rawPreview}}
	   pathTo={pathToMock}/>);    
    
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('rawPreview')).toBeTruthy();

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
    
  });  

  it('should test that options are shown', ()=>{
    const config = {
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
      rawPreview: [
        "'c1': 1, 'c2': 2, 'c3': 3",
        "'c1': 2, 'c2': 3, 'c3': 4",
        "'c1': 3, 'c2': 4, 'c3': 5",
      ]
    }

    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);
    
    render(<LoadActionConfig type={'LOAD_FILE'} config={config} pathTo={pathToMock} />);
    
    // Test if basic options shown
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('loadFileOptions')).toBeTruthy();    
    expect(screen.queryByTestId('loadFileOptions-Advanced')).toBeFalsy();    

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
    
    // Test if advanced options shown after toggling advanced options
    const advancedSwitch = screen.queryByTestId('advancedSwitch')
    expect(advancedSwitch).toBeTruthy();
    userEvent.click(advancedSwitch);       
    expect(screen.queryByTestId('loadFileOptions-Advanced')).toBeTruthy();
  });  

  it('should test uploading a file', (done)=>{
    const preview = [
      {'c1': 1, 'c2': 2, 'c3': 3},
      {'c1': 2, 'c2': 3, 'c3': 4},
      {'c1': 3, 'c2': 4, 'c3': 5},
    ];
    
    const setParams = (data) => {
      expect(data.name).toBe("foo.txt");
      expect(data.path).toBe("./foo.txt");
      expect(data.columns).toEqual(['c1', 'c2', 'c3']);
      expect(data.preview).toEqual(preview);
    };

    const setOutput = (output) => {      
      expect(output[0].preview).toEqual(preview);
      done();
    };

    const setOpenSelectedFile = jest.fn();
    
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

    const config = {
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
    }

    const mockOutput = {output: {test: 'output'}};
    const pathToMock = jest.fn(()=>mockOutput);
    
    render(<LoadActionConfig
	   type={'LOAD_FILE'}
	   config={config}
	   pathTo={pathToMock}
	   setParams={setParams}
	   setOutput={setOutput}
	   setOpenSelectedFile={setOpenSelectedFile}/>);    
    expect(screen.queryByTestId('fileInput')).toBeTruthy();
    expect(screen.queryByTestId('rawPreview')).toBeNull();

    // should be called once
    expect(pathToMock.mock.calls).toHaveLength(1);

    // check result returned
    expect(pathToMock.mock.results[0].value).toEqual(mockOutput);
    
    const fileInput = screen.getByTestId("fileInput");

    const file = new File(["foo"], "foo.txt", {type: "text/plain",});
    userEvent.upload(fileInput, file);    
  });
});
