import React from 'react';
import actionTypes, { FILE, createFileOutput,
		      isInputAligned, isPathReady,
		      isTypeCompatible,
		      reAlignConfig, ReadyStatus} from '../components/Action.prototype';

import { LOAD_FILE, LOAD_CLOUD, CLEANSE, JOIN, AGGREGATE, REGRESSION } from "../../config/components/Config";

window.setImmediate = window.setTimeout;

describe("Action prototypes", () => {
  it("Handles prototype testing load --> cleanse", () =>{
    const loadAc = actionTypes(LOAD_FILE);
    const cleanseAc = actionTypes(CLEANSE);
    
    expect(cleanseAc.input).toEqual(loadAc.output);
    expect(loadAc.input).toBeNull();

    expect(cleanseAc.output).toEqual(cleanseAc.input);
  });

  it("Handles prototype testing load --> join", () =>{
    const loadAc = actionTypes(LOAD_FILE);
    const joinAc = actionTypes(JOIN);

    expect(isTypeCompatible(loadAc.output, joinAc.input)).toBe(true);
    
    expect(loadAc.input).toBeNull();

    expect(joinAc.output).toEqual(loadAc.output);
  });

  it("Handles creating a file output type", () =>{
     const file1 = {
      name: "file1.csv",
      path: "data/file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const expected = {
      type: FILE,
      name: "file1.csv",
      path: "data/file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]    
    };
    expect(createFileOutput(file1)).toEqual(expected);
  });

  it("Handles testing JOIN input/config alignment", () => {
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);
        
    const inputs = [
      {
        output: [fileOutput1],
        outPort: 0
      },
      {
        output: [fileOutput2],
        outPort: 0
      }
    ];
    
    const config = {
      how: 'left',
      join: [['a', 'a1']]
    };

    expect(isInputAligned(JOIN, inputs, config)).toBe(ReadyStatus.OK);

    const config2 = {join: [
      ['a', 'b1'],
      ['a', 'b3']
    ]};

    expect(isInputAligned(JOIN, inputs, config2)).toBe(ReadyStatus.Unready);

    const config3 = {join: [
      [null, null]
    ]};

    expect(isInputAligned(JOIN, inputs, config3)).toBe(ReadyStatus.Unready);
  });

  it("Handles testing LOAD_FILE input/config alignment", () =>{
    expect(isInputAligned(LOAD_FILE, null, {isAvailable: true, path: "data/file1.csv"}))
      .toBe(ReadyStatus.OK);
  });

  it("Handles testing LOAD_CLOUD input/config alignment", () =>{
    const config = {
      ipAddr: "111.222.333.444",
      uname: "user_name",
      secretKey: "a1b2c3",
      bucket: "bucket_name",
      filepath: "user_name/test.csv",
    }
    
    expect(isInputAligned(LOAD_CLOUD, null, config)).toBe(ReadyStatus.OK);
    expect(isInputAligned(LOAD_CLOUD, null, {...config, ipAddr: ""})).toBe(ReadyStatus.Unready);
    expect(isInputAligned(LOAD_CLOUD, null, {...config, uname: ""})).toBe(ReadyStatus.Unready);
    expect(isInputAligned(LOAD_CLOUD, null, {...config, secretKey: ""})).toBe(ReadyStatus.Unready);
    expect(isInputAligned(LOAD_CLOUD, null, {...config, bucket: ""})).toBe(ReadyStatus.Unready);
    expect(isInputAligned(LOAD_CLOUD, null, {...config, filepath: ""})).toBe(ReadyStatus.Unready);
  });

  it("Handles testing CLEANSE/AGGREGATE input/config alignment", () =>{
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    const fileOutput1 = createFileOutput(file1);

    const configCleanse = {
      transformations: [],
      deleted: [],
      options: { is_sample: true, nsamples: 1000}
    }

    const configAgg = {
      aggKey: null,
      aggMap: []
    }

    // Test with valid inputs
    const inputs = [
      {
        readyStatus: ReadyStatus.OK,
        output: [fileOutput1],
        outPort: 0
      }
    ];    
    expect(isInputAligned(CLEANSE, inputs, configCleanse)).toBe(ReadyStatus.OK);
    expect(isInputAligned(AGGREGATE, inputs, configAgg)).toBe(ReadyStatus.OK);

    // Test with empty inputs
    const inputsEmpty = []
    expect(isInputAligned(CLEANSE, inputsEmpty, configCleanse)).toBe(ReadyStatus.PrevMissing);
    expect(isInputAligned(AGGREGATE, inputsEmpty, configAgg)).toBe(ReadyStatus.PrevMissing);

  });
  
  it("Handles testing REGRESSION input/config alignment", () =>{
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]      
    };
    const fileOutput1 = createFileOutput(file1);

    const config = {
      target: "a",
      predictors: ["b", "c"],
      windowSize: 10,
      confidInterval: 95,
      featureSel: false
    }

    // Test with valid inputs
    const inputs = [
      {
	readyStatus: ReadyStatus.OK,
        output: [fileOutput1],
        outPort: 0
      }
    ];    
    expect(isInputAligned(REGRESSION, inputs, config)).toBe(ReadyStatus.OK);

    // Test with empty inputs
    const inputsEmpty = []
    expect(isInputAligned(REGRESSION, inputsEmpty, config)).toBe(ReadyStatus.PrevMissing);

  });

  it("Handles testing isPathReady", () =>{

    // Test a ready flow
    const path1 ={
      ID: 3,
      config: null,
      output: null,
      type: "AK_MINE",
      readyStatus: ReadyStatus.OK,
      input: [
        {
          ID: 2,
          config: null,
          output: null,
          type: "CLEANSE",
	  readyStatus: ReadyStatus.OK,
          input: [
            {
              ID: 1,
              config: null,
              output: null,
              type: "LOAD_FILE",
	      readyStatus: ReadyStatus.OK,
              input: []
            }
          ]
        }
      ]

    }
    expect(isPathReady(path1)).toBe(true);

    // Test a flow with one action not ready
    const path2 ={
      ID: 3,
      config: null,
      output: null,
      type: "AK_MINE",
      readyStatus: ReadyStatus.OK,
      input: [
        {
          ID: 2,
          config: null,
          output: null,
          type: "CLEANSE",
	  readyStatus: ReadyStatus.OK,
          input: [
            {
              ID: 1,
              config: null,
              output: null,
              type: "LOAD_FILE",
	      readyStatus: ReadyStatus.Unready,
              input: []
            }
          ]
        }
      ]

    }
    expect(isPathReady(path2)).toBe(false);

  });
  
  it('should test reAlignConfig for CLEANSE.', () => {
    const node = {
      "ID": 2,
      "type": "CLEANSE",
      "config":{
        "transformations": [
            {
                "tType": "Derived",
                "is_visible": false,
                "enabled": true,
                "is_global": true,
                "attr": "new_derived1",
                "dependency_list": [
                    "eps"
                ],
                "uid": 37,
                "expr": "eps**2",
                "idx": 0
            },
            {
                "tType": "Derived",
                "is_visible": false,
                "enabled": true,
                "is_global": true,
                "attr": "new_derived2",
                "dependency_list": [
                    "eps"
                ],
                "uid": 40,
                "expr": "eps**2",
                "idx": 1
            },
            {
                "tType": "Derived",
                "is_visible": false,
                "enabled": true,
                "is_global": true,
                "attr": "new_derived3",
                "dependency_list": [
                    "price",
                    "eps"
                ],
                "uid": 41,
                "expr": "eps+price",
                "idx": 2
            },
            {
                "tType": "Filter",
                "is_visible": true,
                "enabled": true,
                "is_global": false,
                "attr": "dividend_yield",
                "dependency_list": [
                    "dividend_yield"
                ],
                "uid": 35,
                "lb": 0,
                "ub": 21.88833844074889,
                "inc": 1,
                "idx": 3
            },
            {
                "tType": "Clamp",
                "is_visible": true,
                "enabled": true,
                "is_global": false,
                "attr": "eps",
                "dependency_list": [
                    "eps"
                ],
                "uid": 36,
                "lb": -11.31,
                "ub": 15,
                "idx": 4
            },
            {
                "tType": "Custom",
                "is_visible": true,
                "enabled": true,
                "is_global": false,
                "attr": "eps",
                "dependency_list": [
                    "dividend_yield",
                    "eps"
                ],
                "uid": 38,
                "expr": "eps+dividend_yield",
                "idx": 5
            },
            {
                "tType": "Norm",
                "is_visible": true,
                "enabled": true,
                "is_global": false,
                "attr": "eps",
                "dependency_list": [
                    "eps"
                ],
                "uid": 39,
                "newmin": 0,
                "newmax": 1,
                "idx": 6
            },
            {
              "tType": "OHE",
               "is_visible": true,
               "enabled": true,
              "is_global": true,
              "attr": "sector",
              "dependency_list": [
                "sector"
               ],
              "uid": 4,
              "bind": null,
              "new_cols": [
                "sector_Financials",
                "sector_Health Care",
                "sector_Consumer Staples",
                "sector_Consumer Discretionary",
                "sector_Information Technology",
                "sector_Utilities",
                "sector_Industrials",
                "sector_Materials"
              ],
              "idx": 0
            },
            {
                  "tType": "Rank",
                  "is_visible": true,
                  "enabled": true,
                  "is_global": true,
                  "attr": "sector",
                  "dependency_list": [
                      "sector",
                      "dividend"
                  ],
                  "uid": 5,
                  "rankattr": "dividend",
                  "ranktiers": 3,
                  "new_cols": [
                      "sector_rank3_dividend"
                  ],
                  "idx": 1
            },
            {
                  "tType": "FilterNom",
                  "is_visible": true,
                  "enabled": true,
                  "is_global": false,
                  "attr": "sector_Industrials",
                  "dependency_list": [
                      "sector_Industrials"
                  ],
                  "uid": 6,
                  "filter_cats": [
                      0
                  ],
                  "filter_type": "Include",
                  "inc": 1,
                  "idx": 2
            },
            {
                  "tType": "Repl",
                  "is_visible": true,
                  "enabled": true,
                  "is_global": false,
                  "attr": "sector_rank3_dividend",
                  "dependency_list": [
                      "sector_rank3_dividend"
                  ],
                  "uid": 7,
                  "old_vals": [
                      "rank_0",
                      "rank_2"
                  ],
                  "new_val": "Other",
                  "idx": 3
              }
        ],
        "deleted": [],
        "options": {
            "is_sample": true,
            "nsamples": 1000
        }
      },
      "readyStatus": ReadyStatus.OK,
      "input": [
        {
            "ID": 0,
            "type": "LOAD_FILE",            
	    "readyStatus": ReadyStatus.OK,
            "outPort": 0,
            "output": [{
                "type": "action.type/FILE",
                "colTypes": {
                    "asset_turnover": "Numerical",
                    "dividend": "Numerical",
                    "eps": "Numerical",
                    "liquidity": "Numerical",
                    "on_bal_vol": "Numerical",
                    "operating_leverage": "Numerical",
                    "p/cf": "Numerical",
                    "p/e": "Numerical",
                    "payout_ratio": "Numerical",
                    "peg": "Numerical",
                    "price": "Numerical",
                    "price/book": "Numerical",
                    "price/cashflow": "Numerical",
                    "price/earnings": "Numerical",
                    "price/earnings/growth": "Numerical",
                    "profit_margin": "Numerical",
                    "return": "Numerical",
                    "roa": "Numerical",
                    "roe": "Numerical",
                    "ros": "Numerical",
                    "rsi": "Numerical",
                    "sector": "Nominal",
                    "stoch_osc": "Numerical",
                    "symbol": "Index",
                    "value": "Numerical",
                    "vol_roc": "Numerical",
                    "volatility": "Numerical"
                },
                "columns": [
                    "symbol",
                    "asset_turnover",
                    "liquidity",
                    "dividend",
                    "eps",
                    "return",
                    "on_bal_vol",
                    "operating_leverage",
                    "payout_ratio",
                    "price",
                    "price/book",
                    "price/cashflow",
                    "price/earnings",
                    "price/earnings/growth",
                    "profit_margin",
                    "roa",
                    "roe",
                    "ros",
                    "rsi",
                    "sector",
                    "volatility",
                    "stoch_osc",
                    "vol_roc",
                    "p/e",
                    "peg",
                    "value",
                    "p/cf"
                ],
                "lastModified": 1639157635,
                "name": "sp500_data_rn.csv",
                "options": {
                    "comment": "",
                    "decimal": ".",
                    "delim": ",",
                    "encoding": "utf_8",
                    "escapechar": "",
                    "headerRow": 0,
                    "lineDelim": "",
                    "naOptions": [],
                    "skipEmpty": true,
                    "startLine": 0,
                    "thousands": ""
                },
                "path": "C:\\Users\\dariu\\AK Analyst\\Workspace\\Data\\sp500_data_rn.csv",
                
                "isAvailable": true
            }],
            "input": []
        }
      ]
    }


    const expectedConfig ={
      "transformations": [
        {
          "tType": "Derived",
          "is_visible": false,
          "enabled": true,
          "is_global": true,
          "attr": "new_derived1",
          "dependency_list": [
            "eps"
          ],
          "uid": 37,
          "expr": "eps**2",
          "idx": 0
        },
	      {
          "tType": "Derived",
          "is_visible": false,
          "enabled": true,
          "is_global": true,
          "attr": "new_derived2",
          "dependency_list": [
            "eps"
          ],
          "uid": 40,
          "expr": "eps**2",
          "idx": 1
        },
	      {
          "tType": "Derived",
          "is_visible": false,
          "enabled": true,
          "is_global": true,
          "attr": "new_derived3",
          "dependency_list": [
            "price",
            "eps"
          ],
          "uid": 41,
          "expr": "eps+price",
          "idx": 2
        },
        {
          "tType": "Clamp",
          "is_visible": true,
          "enabled": true,
          "is_global": false,
          "attr": "eps",
          "dependency_list": [
            "eps"
          ],
          "uid": 36,
          "lb": -11.31,
          "ub": 15,
          "idx": 4
        },
        {
          "tType": "OHE",
          "is_visible": true,
          "enabled": true,
          "is_global": true,
          "attr": "sector",
          "dependency_list": [
            "sector"
          ],
          "uid": 4,
          "bind": null,
          "new_cols": [
            "sector_Financials",
            "sector_Health Care",
            "sector_Consumer Staples",
            "sector_Consumer Discretionary",
            "sector_Information Technology",
            "sector_Utilities",
            "sector_Industrials",
            "sector_Materials"
          ],
          "idx": 0
        },
        {
          "tType": "Rank",
          "is_visible": true,
          "enabled": true,
          "is_global": true,
          "attr": "sector",
          "dependency_list": [
            "sector",
            "dividend"
          ],
          "uid": 5,
          "rankattr": "dividend",
          "ranktiers": 3,
          "new_cols": [
            "sector_rank3_dividend"
          ],
          "idx": 1
        },
        {
          "tType": "FilterNom",
          "is_visible": true,
          "enabled": true,
          "is_global": false,
          "attr": "sector_Industrials",
          "dependency_list": [
            "sector_Industrials"
          ],
          "uid": 6,
          "filter_cats": [
            0
          ],
          "filter_type": "Include",
          "inc": 1,
          "idx": 2
        },
        {
          "tType": "Repl",
          "is_visible": true,
          "enabled": true,
          "is_global": false,
          "attr": "sector_rank3_dividend",
          "dependency_list": [
            "sector_rank3_dividend"
          ],
          "uid": 7,
          "old_vals": [
            "rank_0",
            "rank_2"
          ],
          "new_val": "Other",
          "idx": 3
        }
          
      ],
      "deleted": [],
      "options": {
          "is_sample": true,
          "nsamples": 1000
      }
    }

    const realignedConfig = reAlignConfig(node);
    expect(realignedConfig).toEqual(expectedConfig);
  });

  it('should test reAlignConfig for CLEANSE w/rename.', () => {
    const node = {
      "ID": 2,
      "type": "CLEANSE",
      "config":{
        "transformations": [
	  {
	    attr: "eps",
	    dependency_list: [],
	    enabled: true,
	    idx: 0,
	    is_global: false,
	    is_visible: false,
	    name: "eps2",
	    tType: "ColNameChange",
	    uid: 2,
	  },
	  {
	    attr: "eps2",
	    dependency_list: ["eps"],
	    enabled: true,
	    idx: 1,
	    is_global: false,
	    is_visible: true,
	    lb: 0,
	    tType: "Clamp",
	    ub: 49.45,
	    uid: 0,
	  },
	  {
	    attr: "new_derived",
	    dependency_list: ["eps2"],
	    dependent_transforms: [
	      {
		attr: "eps2",
		dependency_list: ["eps"],
		enabled: true,
		idx: 1,
		is_global: false,
		is_visible: true,
		lb: 0,
		tType: "Clamp",
		ub: 49.45,
		uid: 0,
	      }
	    ],
	    enabled: true,
	    expr: "eps2+1",
	    idx: 2,
	    is_global: true,
	    is_visible: false,
	    tType: "Derived",
	    uid: 1,
	  }
	],
	"deleted": [],
        "options": {
          "is_sample": true,
          "nsamples": 1000
        }
      },
      "readyStatus": ReadyStatus.OK,
      "input": [
        {
          "ID": 0,
          "type": "LOAD_FILE",            
	  "readyStatus": ReadyStatus.OK,
          "outPort": 0,
          "output": [{
            "type": "action.type/FILE",
            "colTypes": {
              "asset_turnover": "Numerical",
              "dividend": "Numerical",
              "eps": "Numerical",
              "liquidity": "Numerical",
              "on_bal_vol": "Numerical",
              "operating_leverage": "Numerical",
              "p/cf": "Numerical",
              "p/e": "Numerical",
              "payout_ratio": "Numerical",
              "peg": "Numerical",
              "price": "Numerical",
              "price/book": "Numerical",
              "price/cashflow": "Numerical",
              "price/earnings": "Numerical",
              "price/earnings/growth": "Numerical",
              "profit_margin": "Numerical",
              "return": "Numerical",
              "roa": "Numerical",
              "roe": "Numerical",
              "ros": "Numerical",
              "rsi": "Numerical",
              "sector": "Nominal",
              "stoch_osc": "Numerical",
              "symbol": "Index",
              "value": "Numerical",
              "vol_roc": "Numerical",
              "volatility": "Numerical"
            },
            "columns": [
              "symbol",
              "asset_turnover",
              "liquidity",
              "dividend",
              "eps",
              "return",
              "on_bal_vol",
              "operating_leverage",
              "payout_ratio",
              "price",
              "price/book",
              "price/cashflow",
              "price/earnings",
              "price/earnings/growth",
              "profit_margin",
              "roa",
              "roe",
              "ros",
              "rsi",
              "sector",
              "volatility",
              "stoch_osc",
              "vol_roc",
              "p/e",
              "peg",
              "value",
              "p/cf"
            ],
            "lastModified": 1639157635,
            "name": "sp500_data_rn.csv",
            "options": {
              "comment": "",
              "decimal": ".",
              "delim": ",",
              "encoding": "utf_8",
              "escapechar": "",
              "headerRow": 0,
              "lineDelim": "",
              "naOptions": [],
              "skipEmpty": true,
              "startLine": 0,
              "thousands": ""
            },
	    "path": "C:\\Users\\dariu\\AK Analyst\\Workspace\\Data\\sp500_data_rn.csv",                
            "isAvailable": true
          }],
	  "input": []
	}
      ]
    }

    const expectedConfig = {
      transformations: [
	{
	  attr: "eps",
	  dependency_list: [],
	  enabled: true,
	  idx: 0,
	  is_global: false,
	  is_visible: false,
	  name: "eps2",
	  tType: "ColNameChange",
	  uid: 2,
	},
	{
	  attr: "eps2",
	  dependency_list: ["eps"],
	  enabled: true,
	  idx: 1,
	  is_global: false,
	  is_visible: true,
	  lb: 0,
	  tType: "Clamp",
	  ub: 49.45,
	  uid: 0,
	},
	{
	  attr: "new_derived",
	  dependency_list: ["eps2"],
	  dependent_transforms: [
	    {
	      attr: "eps2",
	      dependency_list: ["eps"],
	      enabled: true,
	      idx: 1,
	      is_global: false,
	      is_visible: true,
	      lb: 0,
	      tType: "Clamp",
	      ub: 49.45,
	      uid: 0,
	    }
	  ],
	  enabled: true,
	  expr: "eps2+1",
	  idx: 2,
	  is_global: true,
	  is_visible: false,
	  tType: "Derived",
	  uid: 1
	}
      ],
      "deleted": [],
      "options": {
        "is_sample": true,
        "nsamples": 1000
      }
    } 

    const result = reAlignConfig(node);
    expect(result).toEqual(expectedConfig);
  });
  
  it('should test reAlignConfig for AGGREGATE.', () => {
    const node = {
      "ID": 2,
      "type": "AGGREGATE",
      "config":{
        aggKey: "age",
        aggMap: [
          {
            aggFunc: {value: "mean", label: "Mean", type: "Numerical"},
            attrs: [
              // Should be removed:
              { label: "heart_disease", value: "heart_disease", type: "Numerical" },
              { label: "avg_glucose_level", value: "avg_glucose_level", type: "Numerical" },
              // Should remain:
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
              // Should be removed:
              { label: "ever_married", value: "ever_married", type: "Nominal" },
              { label: "work_type", value: "work_type", type: "Nominal" },
              // Should remain:
              { label: "Residence_type", value: "Residence_type", type: "Nominal" },
              { label: "smoking_status", value: "smoking_status", type: "Nominal" },
            ],
            bind: []
          },
          {
            aggFunc: {value: "ohe", label: "One-Hot Encoding", type: "Nominal"},
            attrs: [
              // Should remain:
              { label: "gender", value: "gender", type: "Nominal" }
            ],
            bind: [
              // Should remain:
              {
                attr: { label: "None", value: "None", type: "Numerical" },
                func: {value: "max", label: "Max"}
              },
              // Should be removed:
              {
                attr: { label: "avg_glucose_level", value: "avg_glucose_level", type: "Numerical" },
                func: {value: "min", label: "Min"}
              }
            ]
          }
        ]        
      },
      "readyStatus": ReadyStatus.OK,
      "input": [
        {
          "ID": 0,
          "type": "LOAD_FILE",
          "outPort": 0,
          "output": [{
            "colTypes": {
              "Residence_type": "Nominal",
              "age": "Numerical",
              "avg_glucose_level_1": "Numerical",
              "bmi": "Numerical",
              "ever_married_1": "Nominal",
              "gender": "Nominal",
              "heart_disease_1": "Numerical",
              "hypertension": "Numerical",
              "id": "Numerical",
              "smoking_status": "Nominal",
              "stroke": "Numerical",
              "work_type_1": "Nominal",
            },
            "columns": [
              "id",
              "gender",
              "age",
              "hypertension",
              "heart_disease_1",
              "ever_married_1",
              "work_type_1",
              "Residence_type",
              "avg_glucose_level_1",
              "bmi",
              "smoking_status",
              "stroke",
            ],
            "lastModified": 1642525681,
            "name": "stroke_rn.csv",
            "isAvailable": true
          }],
	  "readyStatus": ReadyStatus.OK,
        }
      ]
    }


    const expectedConfig ={
      aggKey: "age",
      aggMap: [
        {
          aggFunc: {value: "mean", label: "Mean", type: "Numerical"},
          attrs: [            
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
            }
          ]
        }
      ]   
    }

    const realignedConfig = reAlignConfig(node);
    expect(realignedConfig).toEqual(expectedConfig);
  });

  it('should test reAlignConfig for JOIN.', () => {
    const node = {
      "ID": 2,
      "type": "JOIN",
      "config":{
        "how": "left",
        "join": [
            [
                "id",
                "id"
            ],
            [
                "ever_married",
                "ever_married"
            ]
        ],
	"suffix": ["_x", "_y"],
	"isDefaultSuffix": true	
      },
      "readyStatus": ReadyStatus.OK,
      "input": [
        {
            "ID": 0,
            "type": "LOAD_FILE",            
	    "readyStatus": ReadyStatus.OK,
            "outPort": 0,
            "output": [{
                "type": "action.type/FILE",
                "colTypes": {
                    "Residence_type": "Nominal",
                    "age": "Numerical",
                    "avg_glucose_level": "Numerical",
                    "bmi": "Numerical",
                    "ever_married": "Nominal",
                    "gender": "Nominal",
                    "heart_disease": "Numerical",
                    "hypertension": "Numerical",
                    "id": "Numerical",
                    "smoking_status": "Nominal",
                    "stroke": "Numerical",
                    "work_type": "Nominal"
                },
                "columns": [
                    "id",
                    "gender",
                    "age",
                    "hypertension",
                    "heart_disease",
                    "ever_married",
                    "work_type",
                    "Residence_type",
                    "avg_glucose_level",
                    "bmi",
                    "smoking_status",
                    "stroke"
                ],
                "lastModified": 1640275893,
                "name": "stroke.csv",
                "path": "stroke.csv",                
                "isAvailable": true
            }],
            "input": []
        },
        {
            "ID": 3,
            "type": "LOAD_FILE",            
            "readyStatus": ReadyStatus.OK,
            "outPort": 0,
            "output": [{
                "type": "action.type/FILE",
                "colTypes": {
                    "Residence type": "Nominal",
                    "age": "Numerical",
                    "avg glucose_level": "Numerical",
                    "bmi": "Numerical",
                    "ever married": "Nominal",
                    "gender": "Nominal",
                    "heart_disease": "Numerical",
                    "hypertension": "Numerical",
                    "id": "Numerical",
                    "smoking_status": "Nominal",
                    "stroke": "Numerical",
                    "work type": "Nominal"
                },
                "columns": [
                    "id",
                    "gender",
                    "age",
                    "hypertension",
                    "heart_disease",
                    "ever married",
                    "work type",
                    "Residence type",
                    "avg glucose_level",
                    "bmi",
                    "smoking_status",
                    "stroke"
                ],
                "lastModified": 1642525681,
                "name": "stroke_rn.csv",
                "path": "stroke_rn.csv",                
                "isAvailable": true
            }],
            "input": []
        }
      ]
    }


    const expectedConfig ={
      "how": "left",
      "join": [
          [
              "id",
              "id"
          ],
          [
              "ever_married",
              null
          ]
      ],
      "suffix": ["_x", "_y"],
      "isDefaultSuffix": true
     } 

    const realignedConfig = reAlignConfig(node);
    expect(realignedConfig).toEqual(expectedConfig);
  });

  it('should test reAlignConfig for AK_MINE.', () => {
    const node = {
      "ID": 2,
      "type": "AK_MINE",
      "config":{
        "options": {
            "is_sample": true,
            "nsamples": 1000
        },
        "target": "fut_return",
        "mineType": "numeric"
      },
      "readyStatus": ReadyStatus.OK,
      "input": [
        {
            "ID": 0,
            "type": "LOAD_FILE",            
	    "readyStatus": ReadyStatus.OK,
            "outPort": 0,
            "output": [{
                "type": "action.type/FILE",
                "colTypes": {
                  "asset_turnover": "Numerical",
                  "dividend": "Numerical",
                  "eps": "Numerical",
                  "liquidity": "Numerical",
                  "return": "Numerical",
              },
                "columns": [                  
                  "asset_turnover",
                  "liquidity",
                  "dividend",
                  "eps",
                  "return",
                ],
                "lastModified": 1640275893,
                "name": "stroke.csv",
                "path": "stroke.csv",                
                "isAvailable": true
            }],
            "input": []
        }
      ]
    }

    const expectedConfig = {
      "target": [],
      "mineType": 'numeric',
      "options": {
          "is_sample": true,
          "nsamples": 1000
      }
    }
    const realignedConfig = reAlignConfig(node);
    expect(realignedConfig).toEqual(expectedConfig);
  });

  it('should test reAlignConfig for AK_BROWSE.', () => {
    const node = {
      "ID": 5,
      "type": "AK_BROWSE",
      "config": {
        "browseType": "card",
        "target": ["attr0"],
        "targetType": "binary",
        "patternSet": [
          {
            "name": "Mined Patterns",
            "patterns": [
              {
                "ID": 0,
                "core": [ "attr1", "attr2" ],
                "others": [ "attr3", "attr4", "attr5" ],            
                "attributes": {
                  "attr1": { "min": "0.0", "max": "1.0", "mean": "0.28", "entropy": "0.59" },
                  "attr2": { "min": "0.5", "max": "inf", "mean": "1.0", "entropy": "0.0" },
                  "attr3": { "min": "1.5", "max": "9.0", "mean": "4.2", "entropy": "0.0" },
                  "attr4": { "min": "3.3", "max": "15.4", "mean": "7.3", "entropy": "0.0" },
                  "attr5": { "categories": [ "cat1", "cat2" ], "entropy": "0.68", "mostFrequent": "cat2" }
                },            
                "shaps": {
                  "attr0": [
                    { "attr": "attr1", "shap": "0.06" },
                    { "attr": "attr2", "shap": "0.04" }
                  ]
                },
                "enhance": [],
                "generalize": [],
                "related": [],
                "name": "High attr0 Prob. (2 Features)"            
              },
              {
                "ID": 2,
                "core": [ "attr2", "attr3" ],
                "others": [ "attr1", "attr4", "attr5" ],            
                "attributes": {
                  "attr1": { "min": "0.0", "max": "0.8", "mean": "0.48", "entropy": "0.29" },
                  "attr2": { "min": "0.6", "max": "inf", "mean": "1.0", "entropy": "0.3" },
                  "attr3": { "min": "2.3", "max": "8.1", "mean": "6.2", "entropy": "0.4" },
                  "attr4": { "min": "2.9", "max": "11.2", "mean": "7.1", "entropy": "0.5" },
                  "attr5": { "categories": [ "cat1", "cat2" ], "entropy": "0.38", "mostFrequent": "cat2" }
                },            
                "shaps": {
                  "attr0": [
                    { "attr": "attr2", "shap": "0.07" },
                    { "attr": "attr3", "shap": "0.03" }
                  ],
                },
                "enhance": [],
                "generalize": [],
                "related": [],
                "name": "High attr0 Prob. (2 Features)"            
              }
            ],
            "filters": {
              "sort": { "dim": null, "direction": null },
              "features": [],
              "numCore": {
                "domain": [ 1, 3 ],
                "selected": [ 1, 3 ]
              },
              "stat": {
                "attr0": {
                  "domain": [ 0, 1 ],
                  "selected": [ 0, 1 ]
                }
              },
              "size": {
                "domain": [ 0, 100 ],
                "selected": [ 0, 100 ]
              }
            }
          },
          {
            "name": "Pinned Patterns",
            "patterns": [
              {
                "ID": 1,
                "core": [ "attr1", "attr5" ],
                "others": [ "attr2", "attr3", "attr4" ],            
                "attributes": {
                  "attr1": { "min": "0.0", "max": "1.0", "mean": "0.28", "entropy": "0.59" },
                  "attr2": { "min": "0.5", "max": "2.0", "mean": "1.2", "entropy": "0.5" },
                  "attr3": { "min": "1.5", "max": "9.0", "mean": "4.2", "entropy": "0.3" },
                  "attr4": { "min": "3.3", "max": "15.4", "mean": "7.3", "entropy": "0.4" },
                  "attr5": { "categories": [ "cat1" ], "entropy": "0.68", "mostFrequent": "cat1" }
                },            
                "shaps": {
                  "attr0": [
                    { "attr": "attr1", "shap": "0.06" },
                    { "attr": "attr5", "shap": "0.04" }
                  ]
                },
                "enhance": [],
                "generalize": [],
                "related": [],
                "name": "High attr0 Prob. (2 Features)"            
              },
              {
                "ID": 3,
                "core": [ "attr1", "attr5" ],
                "others": [ "attr2", "attr3", "attr4" ],            
                "attributes": {
                  "attr1": { "min": "0.6", "max": "inf", "mean": "0.48", "entropy": "0.29"},
                  "attr2": { "min": "0.6", "max": "inf", "mean": "1.0", "entropy": "0.3" },
                  "attr3": { "min": "2.3", "max": "8.1", "mean": "6.2", "entropy": "0.4" },
                  "attr4": { "min": "2.9", "max": "11.2", "mean": "7.1", "entropy": "0.5" },
                  "attr5": { "categories": [ "cat2" ], "entropy": "0.78", "mostFrequent": "cat2" }
                },            
                "shaps": {
                  "attr0": [
                    { "attr": "attr1", "shap": "0.03" },
                    { "attr": "attr5", "shap": "0.07" }
                  ]
                },
                "enhance": [],
                "generalize": [],
                "related": [],
                "name": "High attr0 Prob. (2 Features)"            
              }
            ],
            "filters": {
              "sort": { "dim": null, "direction": null },
              "features": [],
              "numCore": {
                "domain": [ 1, 3 ],
                "selected": [ 1, 3 ]
              },
              "stat": {
                "attr0": {
                  "domain": [ 0, 1 ],
                  "selected": [ 0, 1 ]
                }
              },
              "size": {
                "domain": [ 0, 100 ],
                "selected": [ 0, 100 ]
              }
            }
          }
        ]
      },
      "readyStatus": ReadyStatus.OK,
      "output": [
        {
          "errMsg": ""
        }
      ],
      "input": [
        {
          "ID": 4,
          "outPort": 0,
          "type": "AK_MINE",
          "config": {
            "options": { "is_sample": false, "nsamples": 1000 },
            "method": "fpminer",
            "target": [ "attr0" ],
            "mineType": "binary"
          },
	  "readyStatus": ReadyStatus.OK,
          "output": [
            {
              "itemCount": 41938, "featureCount": 11, "patternCount": 13,
              "maxItems": 37117, "minItems": 599, "maxAttr": 3, "minAttr": 1,
              "target": [ "attr0" ], "targetType": "binary",
              "patterns": [
                {
                  "ID": 0,
                  "constraints": {
                    "attr1": { "lb": "0.0", "ub": "1.0" },
                    "attr2": { "lb": "0.5", "ub": "inf" }
                  }
                },
                {
                  "ID": 1,
                  "constraints": {
                    "attr1": { "lb": "0.6", "ub": "inf" },
                    "attr5": { "in": [ "cat2" ] }
                  }
                }
    
              ]
            }
          ],
          "input": []
        }
      ]
    }

    const expectedConfig = {
      "browseType": "card",
      "target": ["attr0"],
      "targetType": "binary",
      "patternSet": [
        {
          "name": "Mined Patterns",
          "patterns": [
            {
              "ID": 0,
              "core": [ "attr1", "attr2" ],
              "others": [ "attr3", "attr4", "attr5" ],
              "attributes": {
                "attr1": { "min": "0.0", "max": "1.0", "mean": "0.28", "entropy": "0.59" },
                "attr2": { "min": "0.5", "max": "inf", "mean": "1.0", "entropy": "0.0" },
                "attr3": { "min": "1.5", "max": "9.0", "mean": "4.2", "entropy": "0.0" },
                "attr4": { "min": "3.3", "max": "15.4", "mean": "7.3", "entropy": "0.0" },
                "attr5": { "categories": [ "cat1", "cat2" ], "entropy": "0.68", "mostFrequent": "cat2" }
              },
              "shaps": {
                "attr0": [
                  { "attr": "attr1", "shap": "0.06" },
                  { "attr": "attr2", "shap": "0.04" }
                ]
              },
              "enhance": [],
              "generalize": [],
              "related": [],
              "name": "High attr0 Prob. (2 Features)"
            }
          ],
          "filters": {
            "sort": { "dim": null, "direction": null },
            "features": [],
            "numCore": {
              "domain": [ 1, 3 ],
              "selected": [ 1, 3 ]
            },
            "stat": {
              "attr0": {
                "domain": [ 0, 1 ],
                "selected": [ 0, 1 ]
              }
            },
            "size": {
              "domain": [ 0, 100 ],
              "selected": [ 0, 100 ]
            }
          }
        },
        {
          "name": "Pinned Patterns",
          "patterns": [
            {
              "ID": 1,
              "core": [ "attr1", "attr5" ],
              "others": [ "attr2", "attr3", "attr4" ],
              "attributes": {
                "attr1": { "min": "0.6", "max": "inf", "mean": "0.48", "entropy": "0.29"},
                "attr2": { "min": "0.6", "max": "inf", "mean": "1.0", "entropy": "0.3" },
                "attr3": { "min": "2.3", "max": "8.1", "mean": "6.2", "entropy": "0.4" },
                "attr4": { "min": "2.9", "max": "11.2", "mean": "7.1", "entropy": "0.5" },
                "attr5": { "categories": [ "cat2" ], "entropy": "0.78", "mostFrequent": "cat2" }
              },            
              "shaps": {
                "attr0": [
                  { "attr": "attr1", "shap": "0.03" },
                  { "attr": "attr5", "shap": "0.07" }
                ]
              },
              "enhance": [],
              "generalize": [],
              "related": [],
              "name": "High attr0 Prob. (2 Features)"
            }
          ],
          "filters": {
            "sort": { "dim": null, "direction": null },
            "features": [],
            "numCore": {
              "domain": [ 1, 3 ],
              "selected": [ 1, 3 ]
            },
            "stat": {
              "attr0": {
                "domain": [ 0, 1 ],
                "selected": [ 0, 1 ]
              }
            },
            "size": {
              "domain": [ 0, 100 ],
              "selected": [ 0, 100 ]
            }
          }
        }
      ]
    }


    const realignedConfig = reAlignConfig(node);
    // Check one pattern from each list is removed and 
    // the pattern in the Pinned Patterns has its ID changed from 4 to 1
    expect(realignedConfig).toEqual(expectedConfig);
  });

  it('should test reAlignConfig for REGRESSION.', () => {
    const node = {
      "ID": 2,
      "type": "REGRESSION",
      "config":{
        "options": { "is_sample": true, "nsamples": 1000 },
        "target": "qyld_returns",
        "predictors": [
          "return_gspc",
          "return_dji",
          "return_ixic",
          "return_nya"
        ],
        "windowSize": 1,
        "confidInterval": 95,
        "featureSel": false
      },
      "readyStatus": ReadyStatus.OK,
      "input": [{
          "ID": 0,
          "type": "LOAD_FILE",
	  "readyStatus": ReadyStatus.OK,
          "outPort": 0,
          "output": [{
              "type": "action.type/FILE",
              "colTypes": {
                  "date": "Nominal",
                  "return_dji": "Numerical",
                  "return_gspc": "Numerical",
                  "return_rut": "Numerical",
                  "return_stoxx": "Numerical",
                  "return_vix": "Numerical",
                  "vig_returns": "Numerical",
                  "voo_returns": "Numerical",
                  "vti_returns": "Numerical"
              },
              "columns": [
                  "date",
                  "return_dji",
                  "return_gspc",
                  "return_rut",
                  "return_stoxx",
                  "return_vix",
                  "vti_returns",
                  "voo_returns",
                  "vig_returns",
              ],
              "lastModified": 1643997299,
              "name": "benchmarks-returns.csv",
              "isAvailable": true
          }],
          "input": []
      }]
    }

    const expectedConfig = {
      "options": { "is_sample": true, "nsamples": 1000 },
        "target": null,
        "predictors": [
          "return_gspc",
          "return_dji",
        ],
        "windowSize": 1,
        "confidInterval": 95,
        "featureSel": false
    }
    const realignedConfig = reAlignConfig(node);
    expect(realignedConfig).toEqual(expectedConfig);
  });

  it('should test reAlignConfig for VISUALIZER.', () => {
    const node = {
      "ID": 2,
      "type": "VISUALIZER",
      "config": { 
        "options": { "is_sample": true, "nsamples": 1000 },
        "charts": [
          {
            "chart": "line",
            "x": "date",
            "y": [
              {
                "y": "return_dji",
                "lineColor": "#08519c",
                "showLineColor": false,
                "lb": "return_gspc",
                "ub": "return_gspc",
                "marker": "None",
                "markerColor": "#b92e2e",
                "showMarkerColor": false,
                "mkCond": [
                  {
                    "cond": "EQ",
                    "attr": "date"
                  }
                ],
                "mkCondJoin": "AND"
              }
            ]
          }
        ]
      },
      "readyStatus": ReadyStatus.OK,
      "output": [
        { "errMsg": "" }
    ],
    "input": [
        {
          "ID": 1,
          "outPort": 0,
          "type": "LOAD_FILE",
          "config": {
            "colTypes": {
              "Close_Price_qyld": "Numerical",
              "Close_Price_vig": "Numerical",
              "Close_Price_voo": "Numerical",
              "Close_Price_vti": "Numerical",
              "Date": "Nominal"
            },
            "columns": [
              "Date",
              "Close_Price_vti",
              "Close_Price_voo",
              "Close_Price_vig",
              "Close_Price_qyld"
            ],
            "lastModified": 1644246774,
            "name": "funds.csv",
            "options": {
              "comment": "",
              "decimal": ".",
              "delim": ",",
              "encoding": "utf_8",
              "escapechar": "",
              "headerRow": 0,
              "lineDelim": "",
              "naOptions": [],
              "skipEmpty": true,
              "startLine": 0,
              "thousands": ""
            },
            "path": "AK Analyst\\Workspace\\Data\\funds.csv",
            "isAvailable": true
          },
	  "readyStatus": ReadyStatus.OK,
          "output": [
            {
              "type": "action.type/FILE",
              "colTypes": {
                "Close_Price_qyld": "Numerical",
                "Close_Price_vig": "Numerical",
                "Close_Price_voo": "Numerical",
                "Close_Price_vti": "Numerical",
                "Date": "Nominal"
              },
              "columns": [
                "Date",
                "Close_Price_vti",
                "Close_Price_voo",
                "Close_Price_vig",
                "Close_Price_qyld"
              ],
              "lastModified": 1644246774,
              "name": "funds.csv",
              "options": {
                "comment": "",
                "decimal": ".",
                "delim": ",",
                "encoding": "utf_8",
                "escapechar": "",
                "headerRow": 0,
                "lineDelim": "",
                "naOptions": [],
                "skipEmpty": true,
                "startLine": 0,
                "thousands": ""
              },
              "path": "AK Analyst\\Workspace\\Data\\funds.csv",
              "isAvailable": true
            }
          ],
          "input": []
        }
      ]
    }

    const expectedConfig = {
      "options": { "is_sample": true, "nsamples": 1000 },
      "charts": []
    }
    const realignedConfig = reAlignConfig(node);
    expect(realignedConfig).toEqual(expectedConfig);
  });

});
