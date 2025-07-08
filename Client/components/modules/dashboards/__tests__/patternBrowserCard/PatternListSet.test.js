import React from 'react';
import PatternListSet from '../../components/patternBrowserCard/PatternListSet';

import { max, extent, sum } from 'd3';

import {render, cleanup, screen } from "@testing-library/react";

describe("Test for Pattern List Set", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const style = {
      width: 800,
      height: 700,
      top: 10,
      left: 10
    }
    const patterns = [
      {
        ID: 1,
        attributes: {
          attr_1: { min: "-inf", max: "5", shap: 0.15, mean: 3.2 },
          attr_2: { min: "-inf", max: "4", shap: 0.5, mean: 3.2 },
          attr_3: { min: 2, max: 6, mean: 3.2 },
          attr_4: { min: 3, max: 7, shap: 0.25, mean: 3.2 },
          attr_5: { min: 0, max: 10, mean: 3.2 }
        },
        core: [ "attr_1", "attr_2" ],
        other: [ "attr_3", "attr_4", "attr_5"],
        shaps: {
          attr_0: [
            { attr: "attr_3", shap: 0.15 },
            { attr: "attr_4", shap: 0.55 },
            { attr: "attr_5", shap: 0.2},
          ]
        },
        stats: {
          attr_0: {
             size: 27.0,
            mu: 15, min: -5, med: 12, max: 28,
            sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
          }
        },
        tags: ['tag1']
      },
      { 
        ID: 2,
        attributes: {
          attr_1: { min: "-inf", max: "5", mean: 3.2 },
          attr_2: { min: "1", max: "4", mean: 3.2 },
          attr_3: { min: "5", max: "inf", mean: 3.2 },
          attr_4: { min: 3, max: 7, mean: 3.2 },
          attr_5: { min: 0, max: 10, mean: 3.2 }
        },
        core: [ "attr_1", "attr_2", "attr_3", "attr_4"],
        other: [ "attr_5"],
        shaps: {
          attr_0: [
            { attr: "attr_1", shap: 0.15 },
            { attr: "attr_2", shap: 0.5 },
            { attr: "attr_3", shap: 0.35 },
            { attr: "attr_4", shap: 0.25 }
          ]
        },
        stats: {
          attr_0: {
            size: 27.0,
            mu: 15, min: -5, med: 12, max: 28,
            sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
          }
        },
        tags: ['tag1']
      },
      { 
        ID: 3,
        attributes: {
          attr_1: { min: "-1", max: "5", mean: 3.2 },
          attr_2: { min: "1", max: "4", mean: 3.2 },
          attr_3: { min: "5", max: "9", mean: 7.2 },
          attr_4: { min: 3, max: 7, mean: 3.2 },
          attr_5: { min: 0, max: 10, mean: 3.2 }
        },
        core: [ "attr_3"],
        other: [ "attr_1", "attr_2", "attr_4", "attr_5"],
        shaps: {
          attr_0: [
            { attr: "attr_3", shap: 0.45 }
          ]
        },
        stats: {
          attr_0: {
            size: 27.0,
            mu: 15, min: -5, med: 12, max: 28,
            sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
          }
        },
        tags: ['tag1']
      },
      { 
        ID: 4,
        attributes: {
          attr_1: { min: "-1", max: "5", mean: 3.2 },
          attr_2: { min: "1", max: "4", mean: 3.2 },
          attr_3: { min: "5", max: "9", mean: 7.2 },
          attr_4: { min: 3, max: 7, mean: 3.2 },
          attr_5: { min: 0, max: 10, mean: 3.2 }
        },
        core: [ "attr_4" ],
        other: [ "attr_1", "attr_2", "attr_3", "attr_5"],
        shaps: {
          attr_0: [
            { attr: "attr_4", shap: 0.35 }
          ]
        },
        stats: {
          attr_0: {
            size: 27.0,
            mu: 15, min: -5, med: 12, max: 28,
            sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
          }
        },
        tags: ['tag2']
      },
      { 
        ID: 5,
        attributes: {
          attr_1: { min: "-1", max: "5", mean: 3.2 },
          attr_2: { min: "1", max: "4", mean: 3.2 },
          attr_3: { min: "5", max: "9", mean: 7.2 },
          attr_4: { min: 3, max: 7, mean: 3.2 },
          attr_5: { min: 0, max: 10, mean: 3.2 }
        },
        core: [ "attr_5" ],
        other: [ "attr_1", "attr_2", "attr_3", "attr_4"],
        shaps: {
          attr_0: [
            { attr: "attr_5", shap: 0.35 }
          ]
        },
        stats: {
          attr_0: {
            size: 27.0,
            mu: 15, min: -5, med: 12, max: 28,
            sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
          }
        },
        tags: ['tag2']
      },
    ]   

    const overallSummary = {
      stats: {
        attr_0: {
          size: 500,
          mu: -5.6, sig: 8.5,
          min: -33.7, med: -5.5, max: 16.9,
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

    const target = 'attr_0'
    const targetType = 'numeric'

    const patternSet = [
      {
        name: "Mined Patterns",
        patterns: patterns.map( (d,i) => ({
          ...d,
          name: `Pattern ${i+1}`
        })),
        filters: {
          sort: {dim: null, direction: null},
          features: [],
          numCore: {
                    domain: [1, max(patterns, d => d.core.length)],
                    selected: [1, max(patterns, d => d.core.length)],
                  },
          stat: {
                  [target] : {
                    domain: extent(patterns, (d) => (+d.stats[target].mu - overallSummary.stats[target].mu)),
                    selected: extent(patterns, (d) => (+d.stats[target].mu - overallSummary.stats[target].mu))
                  }
                },
          size: {
                  domain: [0, 100],
                  selected: [0, 100],
                },
        }
      },
      {
        name: "Pinned Patterns",
        patterns: []
      }
    ]

    const patternSetMin = [
      {name : "Mined Patterns", len: patternSet[0].patterns.length},
      {name : "Pinned Patterns", len: patternSet[1].patterns.length}
    ]

    const allTags = {
      tag1: "#005500",
      tag2: "#000055"
    }

    const addList = jest.fn();
    const removeList = jest.fn();
    const changeListName = jest.fn();
    const onDragCard = jest.fn();
    const changePatternName = jest.fn();
    const onSelectPattern = jest.fn();
    const toggleAddOutput = jest.fn();
    const onShowCardEdit = jest.fn();
    
    const { container } = render(<PatternListSet
      style={style}
      patternSetMin={patternSetMin}
      patterns={patterns}
      catLabels={{}}
      overallSummary={overallSummary}
      highlightedFeatures={[]}
      target={target}
      targetType={targetType}
      patternSet={patternSet}
      selectedPattern={null}
      addList={addList}
      removeList={removeList}
      changeListName={changeListName}
      onDragCard={onDragCard}
      changePatternName={changePatternName}
      onSelectPattern={onSelectPattern}
      likedPatterns={[]}
      toggleAddOutput={toggleAddOutput}
      allTags={allTags}
      onShowCardEdit={onShowCardEdit}
    />);
    
    // Test 2 lists rendered
    expect(container.getElementsByClassName('patternList').length).toBe(2);
    // Test pattern names rendered    
    patternSet.forEach(d => {
      expect(screen.queryAllByText(d.name)).toBeTruthy();
    });
    
    // Test List 1 has all 5 items
    const list1 = container.getElementsByClassName('patternList')[0]
    expect(list1.getElementsByClassName('patternItem').length).toBe(5);
    
    expect(screen.queryByText("Pattern 1")).toBeTruthy();
    expect(screen.queryByText("Pattern 2")).toBeTruthy();
    expect(screen.queryByText("Pattern 3")).toBeTruthy();
    expect(screen.queryByText("Pattern 4")).toBeTruthy();
    expect(screen.queryByText("Pattern 5")).toBeTruthy();
    
    // Test List 2 has 0 items
    const list2 = container.getElementsByClassName('patternList')[1]
    expect(list2.getElementsByClassName('patternItem').length).toBe(0);

    // Test tags are rendered correctly
    expect(screen.queryAllByText('tag1').length).toBe(3);
    expect(screen.queryAllByText('tag2').length).toBe(2);
  });
});
