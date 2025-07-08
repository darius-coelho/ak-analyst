import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import ScatterConfig from "../../../components/visualizer/configs/ScatterConfig"

import { render, cleanup, screen } from "@testing-library/react";

describe("Test Scatterplot Configurator", () => {
  afterEach(cleanup);

  it("should test the state", () => {    
    const setChartConfig = jest.fn();

    const props = {      
      columns: ['col-1', 'col-2', 'col-3', 'col-4', 'col-5', 'col-6'],
      types: {
        'col-1': 'Nominal', 
        'col-2': 'Numerical', 
        'col-3': 'Numerical', 
        'col-4': 'Numerical', 
        'col-5': 'Numerical',
        'col-6': 'Numerical',
      },
      config: { 
        chart: 'Scatterplot',
        x: 'col-1',
        y: 'col-2',
        pointColor: "#08519c",
        r: "col-3",
        rSizeMin: 6,
        rSizeMax: 20,
        color: "col-4",        
      },
      setChartConfig
    };

    render(<ScatterConfig {...props} />);  
    
    expect(screen.queryByText("Scatterplot Options")).toBeTruthy();    
    expect(screen.queryByText("X Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="x"]`).value).toEqual('col-1')
    expect(screen.queryByText("Y Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="y"]`).value).toEqual('col-2')
    expect(screen.queryByText("Color")).toBeTruthy();
    expect(screen.queryByText("Radius Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="r"]`).value).toEqual('col-3')
    expect(screen.queryByText("Radius Size")).toBeTruthy();
    expect(document.querySelector(`input[name="rSizeMin"]`).value).toEqual('6')
    expect(screen.queryByText("Radius Size (Max)")).toBeTruthy();
    expect(document.querySelector(`input[name="rSizeMax"]`).value).toEqual('20')
    expect(screen.queryByText("Color Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="color"]`).value).toEqual('col-4')

  });
});
