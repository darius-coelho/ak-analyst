import React from 'react';
import PatternListSet from '../../components/patternBrowserCard/PatternListSet';
import { PatternCard } from '../../components/patternBrowserCard/PatternCard';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for Pattern Card", () => {
  afterEach(cleanup);

  it("should test the general pattern card state", () => {
    const pattern = {
      ID: 1,
      attributes: {
        attr_1: { min: "-inf", max: "5", mean: 3.2 },
        attr_2: { min: "1", max: "4", mean: 3.2 },
        attr_3: { min: "5", max: "inf", mean: 3.2 },
        attr_4: { min: 3, max: 7, mean: 3.2 },
        attr_5: { min: 0, max: 10, mean: 3.2 }
      },
      name: 'my_pattern_1',
      core: [ "attr_1", "attr_2", "attr_3", "attr_4"],
      other: [ "attr_5" ],
      shaps: {
        attr_0: [
          { attr: "attr_1", shap: 0.15 },
          { attr: "attr_2", shap: 0.55 },
          { attr: "attr_3", shap: 0.35 },
          { attr: "attr_4", shap: 0.25 }
        ]
      },
      stats: {
        attr_0: {
          size: 50,
          mu: 8, min: 1, med: 7, max: 10,
          sig: 5, prob: -15, es: 0.85, pval: "1.02e-09",
        }
      },
      tags: ['tag1']
    }
      
    const overallSummary = {
      stats: {
        attr_0: {
          size: 500,
          mu: 5, sig: 8.5,
          min: 0, med: 5, max: 10,
          prob: -5.6
        }
      },
      attributes: {
        attr_1: { min: 0, max: 10, mean: 3.2 },
        attr_2: { min: 0, max: 10, mean: 3.2 },
        attr_3: { min: 0, max: 10, mean: 3.2 },
        attr_4: { min: 0, max: 10, mean: 3.2 },
        attr_5: { min: 0, max: 10, mean: 3.2 }
      }
    }

    const patternSetMin = [
      {name : "Set 1", len: 2},
      {name : "Set 2", len: 0}
    ]

    const allTags = {
      tag1: "#005500",
      tag2: "#000055"
    }

    const changePatternName = jest.fn();
    const onSelectPattern = jest.fn();
    const toggleAddOutput = jest.fn();
    
    const { container } = render(
      <PatternCard
        patternSetMin={patternSetMin}
        listId={0}
        index={0}
        data={pattern}
        view={'peek'}
        target={"attr_0"}
        targetType={'numeric'}
        catLabels={{}}
        allTags={allTags}
        overallSummary={overallSummary}
        changePatternName={changePatternName}
        onSelectPattern={onSelectPattern}
        highlightedFeatures={[]}
        likedPatterns={[]}
        toggleAddOutput={toggleAddOutput}
      />);   
    
    // Test Pattern Title
    expect(screen.queryByText("my_pattern_1")).toBeTruthy();
    
    // Test 3 attributes rendered
    expect(screen.queryAllByText("attr_1").length).toBe(2);
    expect(screen.queryAllByText("attr_2").length).toBe(2);
    expect(screen.queryAllByText("attr_3").length).toBe(2);

    // Test 4th attribute not rendered
    expect(screen.queryAllByText("attr_4").length).toBe(0);

    // Test text indicating extra attributes rendered
    expect(screen.queryByText("+1 attributes")).toBeTruthy();
    
    // Test mean diff rendered for numeric mine type
    expect(screen.queryByText("+3")).toBeTruthy();
    expect(screen.queryByText("vs the mean")).toBeTruthy();
    
    // Test dataset % rendered
    expect(screen.queryByText("10.0%")).toBeTruthy();
    expect(screen.queryByText("of the data")).toBeTruthy();
    expect(screen.queryByText("menu")).toBeTruthy();
    // Test correct tag rendered
    expect(screen.queryByText("tag1")).toBeTruthy();
    expect(screen.queryByText("tag2")).toBeFalsy();
  });

  it("should test the detail pattern card state", () => {
    const style = {
      width: 800,
      height: 700,
      top: 10,
      left: 10
    }
    
    const pattern = {
      ID: 1,
      attributes: {
        attr_1: { min: "-inf", max: "5", mean: 3.2 },
        attr_2: { min: "1", max: "4", mean: 3.2 },
        attr_3: { min: "5", max: "inf", mean: 3.2 },
        attr_4: { min: 3, max: 7, mean: 3.2 },
        attr_5: { min: 0, max: 10, mean: 3.2 }
      },
      name: 'my_pattern_1',
      core: [ "attr_1", "attr_2", "attr_3", "attr_4"],
      other: [ "attr_5" ],
      shaps: {
        attr_0: [
          { attr: "attr_1", shap: 0.15 },
          { attr: "attr_2", shap: 0.55 },
          { attr: "attr_3", shap: 0.35 },
          { attr: "attr_4", shap: 0.25 }
        ]
      },
      stats: {
        attr_0: {
          size: 50,
          mu: 8, min: 1, med: 7, max: 10,
          sig: 5, prob: -15, es: 0.85, pval: "1.02e-09",
        }
      },
      tags: ['tag1']
    }

    const comparePattern = {
      ID: 2,
      attributes: {
        attr_1: { min: "-inf", max: "5", mean: 3.2 },
        attr_2: { min: "1", max: "4", mean: 3.2 },
        attr_3: { min: "5", max: "inf", mean: 3.2 },
        attr_4: { min: 1, max: 9, mean: 3.2 },
        attr_5: { min: 0, max: 10, mean: 3.2 }
      },
      name: 'my_pattern_2',
      core: [ "attr_1", "attr_2", "attr_3" ],
      other: [  "attr_4", "attr_5" ],
      shaps: {
        attr_0: [
          { attr: "attr_1", shap: 0.25 },
          { attr: "attr_2", shap: 0.55 },
          { attr: "attr_3", shap: 0.45 }
        ]
      },
      stats: {
        attr_0: {
          size: 100,
          mu: 21, min: 1, med: 7, max: 10,
          sig: 5, prob: -15, es: 0.85, pval: "1.02e-09",
        }
      },
      tags: ['tag2']
    }
      
    const overallSummary = {
      stats: {
        attr_0: {
          size: 500,
          mu: 5, sig: 8.5,
          min: 0, med: 5, max: 10,
          prob: -5.6
        }
      },
      attributes: {
        attr_1: { min: 0, max: 10, mean: 3.2 },
        attr_2: { min: 0, max: 10, mean: 3.2 },
        attr_3: { min: 0, max: 10, mean: 3.2 },
        attr_4: { min: 0, max: 10, mean: 3.2 },
        attr_5: { min: 0, max: 10, mean: 3.2 }
      }
    }

    const patternSetMin = [
      {name : "Set 1", len: 2},
      {name : "Set 2", len: 0}
    ]

    const allTags = {
      tag1: "#005500",
      tag2: "#000055"
    }
    
    const changePatternName = jest.fn();
    const onSelectPattern = jest.fn();
    const toggleAddOutput = jest.fn();

    const { container } = render(
      <PatternCard
        patternSetMin={patternSetMin}
        listId={0}
        index={0}
        data={pattern}
        view={'detail'}
        target={"attr_0"}
        targetType={'numeric'}
        catLabels={{}}
        allTags={allTags}
        overallSummary={overallSummary}
        compareSummary={comparePattern}
        changePatternName={changePatternName}
        onSelectPattern={onSelectPattern}
        highlightedFeatures={[]}
        likedPatterns={[]}
        toggleAddOutput={toggleAddOutput}
      />);
    
    // Test Pattern Title
    expect(screen.queryByText("my_pattern_1")).toBeTruthy();
    
    // Test 3 attributes rendered
    expect(screen.queryAllByText("attr_1").length).toBe(2);
    expect(screen.queryAllByText("attr_2").length).toBe(2);
    expect(screen.queryAllByText("attr_3").length).toBe(2);

    // Test 4th attribute not rendered
    expect(screen.queryAllByText("attr_4").length).toBe(0);

    // Test text indicating extra attributes rendered
    expect(screen.queryByText("+1 attributes")).toBeTruthy();
    
    // Test global mean diff
    expect(screen.queryByText("+3")).toBeTruthy();
    // Test mean diff compared to compare pattern
    expect(screen.queryByText("-13.00")).toBeTruthy();
    expect(screen.queryByText("vs the mean")).toBeTruthy();
    
    // Test dataset % rendered
    expect(screen.queryByText("10.0%")).toBeTruthy();
    // Test dataset % relative to compare pattern dataset %
    expect(screen.queryByText("-10.0%")).toBeTruthy();
    expect(screen.queryByText("of the data")).toBeTruthy();
    expect(screen.queryByText("menu")).toBeTruthy();
    // Test correct tag rendered
    expect(screen.queryByText("tag1")).toBeTruthy();
    expect(screen.queryByText("tag2")).toBeFalsy();
  });

});
