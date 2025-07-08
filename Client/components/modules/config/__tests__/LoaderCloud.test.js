import React from 'react';
import LoaderCloud from "../components/LoaderCloud"

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import * as axios from "axios";

jest.mock("axios");

window.setImmediate = window.setTimeout;

describe("cloud load action config panel section", () => {
  afterEach(cleanup);  

  it('should test that options are shown', ()=>{
    const config = {
      ipAddr: "111.222.333.444",
      uname: "user_name",
      secretKey: "a1b2c3",
      bucket: "bucket_name",
      filepath: "user_name/test.csv",
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
    }
        
    render(<LoaderCloud config={config}/>);        
    
    // Test if config shown
    expect(screen.queryByText('Datalake Credentials')).toBeTruthy();

    expect(screen.queryByText('IP Address')).toBeTruthy();
    expect(document.querySelector(`input[name="ipAddr"]`).value).toEqual('111.222.333.444')

    expect(screen.queryByText('Username')).toBeTruthy();
    expect(document.querySelector(`input[name="uname"]`).value).toEqual('user_name')

    expect(screen.queryByText('Secret Key')).toBeTruthy();
    expect(document.querySelector(`input[name="secretKey"]`).value).toEqual('a1b2c3')

    expect(screen.queryByText('Bucket')).toBeTruthy();
    expect(document.querySelector(`input[name="bucket"]`).value).toEqual('bucket_name')

    expect(screen.queryByText('File Path')).toBeTruthy();
    expect(document.querySelector(`input[name="filepath"]`).value).toEqual('user_name/test.csv')
  });    
});
