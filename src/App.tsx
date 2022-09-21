import './App.css';

import React from 'react';
import { XTerm } from 'xterm-for-react'
import { Terminal } from 'xterm'
import { Connect, IConnectionChangeInfo} from './Connect.tsx'
import {BuildsAvailable} from './BuildsAvailable.tsx';
import { BuildManager } from './Business/BuildManager.tsx';
import BuildArea from './BuildArea.tsx';
import {ErrorMessage} from './Messages/Error.tsx'
import {WarningMessage} from './Messages/Warning.tsx'
import {SuccessMessage} from './Messages/Success.tsx'

enum ActionPlacement { Left, Right, Center }

interface IAction {
  Label : string;
  Placement : ActionPlacement;
  Func : ()=>void;
}


interface IAppProps {

}

interface IAppState {
  hasSerial : boolean;
  terminal : Terminal | null;
  actions : IAction[];
  connection: IConnectionChangeInfo | null;
 
}

class App extends React.Component<IAppProps, IAppState> {
  _xtermRef : React.RefObject<XTerm>;
  _connectRef : React.RefObject<Connect>;
  _buildAreaRef : React.RefObject<BuildArea>;
  constructor(props) {
    super(props);
    this._xtermRef = React.createRef();
    this._connectRef = React.createRef();
    this._buildAreaRef = React.createRef();
    this.state = { hasSerial: navigator.serial!==undefined, terminal: null, actions: [], connection: null, build: null };
    const script = document.createElement("script");

    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.3/pako.js";
    script.async = true;

    document.body.appendChild(script);
    
    
  }

  componentDidMount () {
    if(this._connectRef.current!==null) 
      this.setState({ 
         terminal:  this._xtermRef.current?.terminal===undefined ? null : this._xtermRef.current?.terminal,
         actions: this._connectRef.current.Actions 
      });
  }
  componentWillUnmount () {
    if(this._connectRef.current!==null)
      this.setState({
        terminal: null
      });
  }

  async handleConnectionChanged(pChange : IConnectionChangeInfo) {
    if(pChange === null || pChange.info === null) {
      this.setState({
          connection : null,
       
      });
      this._buildAreaRef.current.setBuild(null);
    }
    this.setState({
      connection: pChange
    });
  }

  async handleBuildChanged(pChange : BuildManager | null) {
    this._buildAreaRef.current.setBuild(pChange, this.state.connection);
    
  }


  render() {
    if(!this.state.hasSerial) 
      return (
        <div className="Add">
          <header className="page-header">
          <p className='topmenu'></p>
            <h1 className="project-name">Airmeter.io Flash Tool</h1>
            <h2 className="project-tagline">This tool flashes supported devices with Airmeter.io releases.</h2>
          </header>
          <main className="main-content">
            <ErrorMessage Title="It looks like there was a problem." 
                          Message=" Your browser does not support the Web Serial API. Please use the desktop versions of either Chrome, Edge or Opera."/>
                        
          </main>      
        </div>)
    return (
     <div className="App">
        <header className="page-header">
        <div className='topmenu'>
        
          <Connect  ref={this._connectRef} Terminal={this.state.terminal} OnConnectionChanged={this.handleConnectionChanged.bind(this)} />
          {this.state.connection == null ? (<div/>) : (<BuildsAvailable ConnectionInfo={this.state.connection.info} OnBuildChanged={this.handleBuildChanged.bind(this)} />)}
        </div>
          <h1 className="project-name">Airmeter.io Flash Tool</h1>
          <h2 className="project-tagline">This tool flashes supported devices with Airmeter.io releases.</h2>
         
        </header>
        <main className="main-content">
          <div>
          <BuildArea  ref={this._buildAreaRef} />
          <h2>Serial Console</h2>
            <XTerm ref={this._xtermRef} options={{ fontFamily: "Consolas, 'Courier New', monospace", cols: 125, rows: 5 }}/>
          </div>
        </main>
      </div>
    );
  }
}


export {App, IAction, ActionPlacement};
