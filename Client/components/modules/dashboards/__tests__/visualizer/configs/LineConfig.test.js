import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import LineConfig from "../../../components/visualizer/configs/LineConfig"

import { render, cleanup, screen } from "@testing-library/react";

describe("Test Line Configurator", () => {
  afterEach(cleanup);

  it("should test the state", () => {    
    const setChartConfig = jest.fn();

    const props = {      
      columns: ['col-1', 'col-2', 'col-3', 'col-4', 'col-5', 'col-6'],
      types: {
        'col-1': 'DateTime', 
        'col-2': 'Numerical', 
        'col-3': 'Numerical', 
        'col-4': 'Numerical', 
        'col-5': 'Numerical',
        'col-6': 'Numerical',
      },
      config: { 
        chart: 'Line Chart',
        x: 'col-1',
        y: [{
              y: 'col-2',
              lineColor: "#08519c",
              showLineColor: false,
              lb: "col-3",
              ub: "col-4",
              marker: "Circle",
              markerColor: "#b92e2e",
              showMarkerColor: false,
              mkCond: [{
                cond: "EQ",
                attr: 'col-5',
              }],
              mkCondJoin: "AND"               
          },
          {
            y: 'col-6',
            lineColor: "#08519c",
            showLineColor: false,
            lb: "None",
            ub: "None",
            marker: "None",
            markerColor: "#b92e2e",
            showMarkerColor: false,
            mkCond: [{
              cond: "EQ",
              attr: 'col-5',
            }],
            mkCondJoin: "AND"               
        }] 
        },
      setChartConfig
    };

    render(<LineConfig {...props} />);  
    
    expect(screen.queryByText("Line Chart Options")).toBeTruthy();    
    expect(screen.queryByText("X Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="x"]`).value).toEqual('col-1')

    expect(screen.queryAllByText("Y Attribute").length).toEqual(2);
    expect(screen.queryAllByText("Lower Bound Attribute").length).toEqual(2);
    expect(screen.queryAllByText("Upper Bound Attribute").length).toEqual(2);
    expect(screen.queryAllByText("Marker Type").length).toEqual(2);
    expect(screen.queryAllByText("Condition Join").length).toEqual(1);
    expect(screen.queryAllByText("Condition").length).toEqual(1);

    expect(screen.queryByText("Line 1")).toBeTruthy();    
    expect(document.querySelectorAll(`select[name="y"]`)[0].value).toEqual('col-2')
    expect(document.querySelectorAll(`select[name="lb"]`)[0].value).toEqual('col-3')
    expect(document.querySelectorAll(`select[name="ub"]`)[0].value).toEqual('col-4')
    expect(document.querySelectorAll(`select[name="marker"]`)[0].value).toEqual('Circle')
    expect(document.querySelectorAll(`select[name="mkCondJoin"]`)[0].value).toEqual('AND')
    expect(document.querySelectorAll(`select[name="mkCond"]`)[0].value).toEqual('EQ')
    expect(document.querySelectorAll(`select[name="mkCondVar"]`)[0].value).toEqual('col-5')

    expect(screen.queryByText("Line 2")).toBeTruthy();
    expect(document.querySelectorAll(`select[name="y"]`)[1].value).toEqual('col-6')
    expect(document.querySelectorAll(`select[name="lb"]`)[1].value).toEqual('None')
    expect(document.querySelectorAll(`select[name="ub"]`)[1].value).toEqual('None')
    expect(document.querySelectorAll(`select[name="marker"]`)[1].value).toEqual('None')

  });
});
