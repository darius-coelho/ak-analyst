const electron = require('electron');
const axios =  require("axios");
const path = require('path');
const url = require('url');
const loadBalancer = require('electron-load-balancer');
require('@electron/remote/main').initialize() // Initialize electron remote
const kill = require('kill-port');

const fs = require('fs'); // Load the File System to execute our common tasks (CRUD)
const { app, dialog, ipcMain, shell, remote, nativeImage, BrowserWindow, Menu } = electron;


ipcMain.on('save-file-reply', (event, stateData) => {
  /** Recieves state as a string and saves it as a .aka file. */
  dialog
  .showSaveDialog(
    BrowserWindow.getFocusedWindow(),
    {
      title: 'Save Pipeline',
      filters: [
        { name: 'AK Analyst File', extensions: ['aka'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
  )
  .then( file => {
    fs.writeFile(
      file.filePath.toString(),
      stateData,
      function (err) {
        if (err) throw err;
        dialog.showMessageBox({message: "Saved Successfully!"});
      }
    );
  })
  .catch(err => {
    dialog.showMessageBox({message: "Error: " +err});
  });
});

ipcMain.on('loadPipeline', () => {
  dialog
  .showOpenDialog({
    title: 'Open Pipeline',
    filters: [
      { name: 'AK Analyst File', extensions: ['aka'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  .then(function (response) {
    if (!response.canceled) {
      // Handle fully qualified file name
      const selectedFilename = response.filePaths[0]
      fs.readFile(selectedFilename, 'utf-8', (err, data) => {
        if(err){
          dialog.showMessageBox({message: "An error ocurred reading the file :"  + err.message});
          return;
        }
        // Send file content as a string to Main.js
        mainWindow.webContents.send('open-file', data);
      });
    }
    else {
      dialog.showMessageBox({message: "no file selected"});
    }
  });
})

if (process.env.DEV) {
  const {
    default: installExtension,
    REDUX_DEVTOOLS,
    REACT_DEVELOPER_TOOLS,
  } = require('electron-devtools-installer');

  app.whenReady().then(() => {
    installExtension(REDUX_DEVTOOLS).then(name =>
      console.log(`Added Extension:  ${name}`),
    );
    installExtension(REACT_DEVELOPER_TOOLS).then(name =>
      console.log(`Added Extension:  ${name}`),
    );
  });
}

const icon = nativeImage.createFromPath(path.join(__dirname, 'ak_logo.png'));
let mainWindow;

const isMac = process.platform === 'darwin'

/** Kill background process */
function killBackgroundProcess() {
  axios.get("http://127.0.0.1:5000/ClearCache")
  .then(()=> {
    kill(5000, 'tcp')
    .then((e) => {console.log(e); app.quit();})
    .catch((e) => {console.log(e); app.quit();})
  })
  .catch((error)=>{
    console.error(error);
  })  
}

/** Generates an about box popup. */
function showAbout() {
  dialog.showMessageBox({
    title: `About Akai Kaeru Analyst`,
    message: `AK Analyst 1.1.1`,
    detail: `A platform to clean, transform, analyze and model high-dimensional data.`,
    buttons: [],
  });
}

/** Downloads the logfile */
function onDownloadLogFile() {
  const startUrl = 'http://127.0.0.1:5000/';
  
  const endPoint = startUrl + "DownloadLogFile";
  axios.post(endPoint, {}, {withCredentials: true})
    .then((res)=>{
      mainWindow.webContents.send('download', res.data)
    }, (error) => {
      console.log(error);
    });
}


function createWindow() {
  const startUrl = process.env.DEV
    ? 'http://localhost:3000'
    : url.format({
        pathname: path.join(__dirname, '/../public/index.html'),
        protocol: 'file:',
        slashes: true,
      });
  
  mainWindow = new BrowserWindow({
      show: false,
      icon,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      width: 1000,
      height: 800,
      minWidth: 500,
      minHeight: 300,
      frame: false
    });    

  if(isMac){
    const menu = Menu.buildFromTemplate([
        ...(isMac ? [{
          label: "AK Analyst",
          submenu: [
            {
              label: 'About',
              click () {
                showAbout()
              }
            },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }] : []),
        {
          label: 'Menu',
          submenu: [
            {
              label:'Load Pipeline',
              click() {
                dialog
                .showOpenDialog({
                  title: 'Open Pipeline',
                  filters: [
                    { name: 'AK Analyst File', extensions: ['aka'] },
                    { name: 'All Files', extensions: ['*'] }
                  ],
                  properties: ['openFile']
                })
                .then(function (response) {
                  if (!response.canceled) {
                    // Handle fully qualified file name
                    const selectedFilename = response.filePaths[0]
                    fs.readFile(selectedFilename, 'utf-8', (err, data) => {
                      if(err){
                        dialog.showMessageBox({message: "An error ocurred reading the file :"  + err.message});
                        return;
                      }
                      // Send file content as a string to Main.js
                      mainWindow.webContents.send('open-file', data);
                    });
                  }
                  else {
                    dialog.showMessageBox({message: "no file selected"});
                  }
                });
              }
            },
            {
              label:'Save Pipeline',
              click() {
                mainWindow.webContents.send('save-file', "Save")
              }
            },
            {
              label: 'Exit',
              click() {
                killBackgroundProcess();
              }
            }
          ]
        },        
        {
            label: 'View',
            submenu: [
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'reload' },
                { role: 'toggleDevTools' },
            ]
        },
        {
          label: 'Help',
          submenu: [
            { 
              label:'Documentation',
              click: async () => {                
                await shell.openExternal('https://akaikaeru.com/wp-content/uploads/2022/04/AK_Analyst_-_User_Guide.pdf')
              }
            },
            { 
              label:'Tutorial Videos',
              click: async () => {                
                await shell.openExternal('https://www.youtube.com/channel/UCzkVfxUYVqPYgtttryKZBWA')
              }
            },
            { type: 'separator' },
            { 
              label:'Contact',
              click: async () => {                
                await shell.openExternal('https://akaikaeru.com/contact-us/')
              } 
            },
            { type: 'separator' },
	          { label: 'Download Logs', click () { onDownloadLogFile() }},
            { type: 'separator' },
            {
              label: 'About',
              click () {
                showAbout()
              }
            }
          ]
        }
      ])
    
    Menu.setApplicationMenu(menu);
  }

  mainWindow.maximize();
  mainWindow.show();

  mainWindow.loadURL(startUrl);
  process.env.DEV && mainWindow.webContents.openDevTools();
  
  mainWindow.on('closed', function () {
    loadBalancer.stopAll();
  });

  ipcMain.on('minimize', () => {
    mainWindow.minimize();
  })

  ipcMain.on('maximize', () => {
    if(mainWindow.isMaximized()){
      mainWindow.unmaximize();
    }
    else {
      mainWindow.maximize();
    }
  })
  
  ipcMain.on('close', () => {
    killBackgroundProcess();
  })

  // Do not run killBackgroundProcess when closing expired software as exe is not started
  ipcMain.on('close-exp', () => {
    app.quit();
  })
  
  // Activate electron remote for this window
  require("@electron/remote/main").enable(mainWindow.webContents);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  killBackgroundProcess();
});

app.on('before-quit', () => {
  killBackgroundProcess();
});

app.on('will-quit', () => {
  killBackgroundProcess();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

