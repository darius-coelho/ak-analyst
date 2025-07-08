import React from 'react';
import { HashRouter } from 'react-router-dom';

import { AggregateActionConfig } from "../components/AggregateActionConfig";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

window.setImmediate = window.setTimeout;

describe("Aggregate action config panel", ()=>{
  afterEach(cleanup);

  it('should test initial state', ()=>{
    const config = {
      aggKey: null,
      aggMap: [],
    };
    render(<HashRouter><AggregateActionConfig config={config} /></HashRouter>);
    
    expect(screen.queryByText("Launch Data Aggregator")).toBeTruthy();    
  });


  it('should test aggregate config', ()=>{

    const config = {
      aggKey: "age",
      aggMap: [
        {
          aggFunc: {value: "mean", label: "Mean", type: "Numerical"},
          attrs: [
            { label: "heart_disease", value: "heart_disease", type: "Numerical" },
            { label: "avg_glucose_level", value: "avg_glucose_level", type: "Numerical" },
            { label: "bmi", value: "bmi", type: "Numerical" },
            { label: "stroke", value: "stroke", type: "Numerical" },
          ],
          bind: []
        },
        {
          aggFunc: {value: "var", label: "Variance", type: "Numerical"},
          attrs: [
            { label: "hypertension", value: "hypertension", type: "Numerical" }
          ],
          bind: []
        },
        {
          aggFunc: {value: "max_count", label: "Most Frequent", type: "Nominal"},
          attrs: [
            { label: "ever_married", value: "ever_married", type: "Nominal" },
            { label: "work_type", value: "work_type", type: "Nominal" },
            { label: "Residence_type", value: "Residence_type", type: "Nominal" },
            { label: "smoking_status", value: "smoking_status", type: "Nominal" },
          ],
          bind: []
        },
        {
          aggFunc: {value: "ohe", label: "One-Hot Encoding", type: "Nominal"},
          attrs: [
            { label: "gender", value: "gender", type: "Nominal" }
          ],
          bind: [
            {
              attr: { label: "None", value: "None", type: "Numerical" },
              func: {value: "max", label: "Max"}
            },
            {
              attr: { label: "avg_glucose_level", value: "avg_glucose_level", type: "Numerical" },
              func: {value: "min", label: "Min"}
            }
          ]
        }
      ]        
    }

    render(<HashRouter><AggregateActionConfig config={config} /></HashRouter>);
    expect(screen.queryByText("Launch Data Aggregator")).toBeTruthy();
    expect(screen.queryByText("Key Attribute")).toBeTruthy();
    expect(screen.queryByText(config.aggKey)).toBeTruthy();
    
    // Test attributes are rendered correctly
    config.aggMap.forEach( d => {
      d.attrs.forEach( a => {
        expect(screen.queryByText(a.value)).toBeTruthy();
      })
    }); 
    
    // Test function names are mapped to display names
    expect(screen.queryByText("One-Hot Encoding")).toBeTruthy();   
    expect(screen.queryByText("Variance")).toBeTruthy();   
    expect(screen.queryByText("Most Frequent")).toBeTruthy();
  });
});
