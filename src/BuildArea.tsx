import './App.css';

import React from 'react';
import {BuildManager} from './Business/BuildManager.ts'
import {SuccessMessage} from './Messages/Success.tsx'
import {WarningMessage} from './Messages/Warning.tsx'
import {ErrorMessage} from './Messages/Error.tsx'
import {EraseDevice} from './EraseDevice.tsx';
import Build from './Build.tsx';
import BuildInfo from './BuildInfo.tsx';
import { Connect, IConnectionChangeInfo} from './Connect.tsx'

interface IBuildAreaProps {
   
}

enum BuildAreaScreen {
  Home,
  Erase,
  Configure
};

interface IBuildAreaState {
  Build : BuildManager | null;
  Connection: IConnectionChangeInfo | null;
  Screen : BuildAreaScreen;
}

class BuildArea extends React.Component<IBuildAreaProps, IBuildAreaState> {
 
  constructor(props) {
    super(props);
  
  }


  componentDidMount () {
    this.setState({ Build: null });
  }

   setBuild(pBuild : BuildManager | null, pConnection : IConnectionChangeInfo | null) {
      this.setState({ Build: pBuild, Connection: pConnection, Screen: BuildAreaScreen.Home });
   }

  returnHome(event) {
    if(event!==undefined)
      event.preventDefault();
    this.setState({Screen: BuildAreaScreen.Home});
  }

  eraseDevice() {    
    this.setState({Screen: BuildAreaScreen.Erase});
  }

  render() {

    if(this.state == null || this.state.Build===null){
      return [
      (<div className="site-breadcrumb"><span>Home</span></div>),
      (<WarningMessage Title="No available build" 
      Message="Please connect a compatible ESP32 device by USB to your computer and use the connect button to start."/>)] ;
    }

    switch(this.state.Screen) {
       case BuildAreaScreen.Configure :
         return [
            (<div className="site-breadcrumb"><a onClick={this.returnHome.bind(this)} href="/features">Home</a>&nbsp;&gt;
            <span>Configure Device</span></div>),
            (<div>
              <EraseDevice Build={this.state.Build} Connection={this.state.Connection} OnClose={this.returnHome.bind(this)}/>    
            </div>)];
       case BuildAreaScreen.Erase :  
       return [
          (<div className="site-breadcrumb"><a onClick={this.returnHome.bind(this)} href="/features">Home</a>&nbsp;&gt;
          <span>Erase Device</span></div>),
          (<div>
            <EraseDevice Build={this.state.Build} Connection={this.state.Connection} OnClose={this.returnHome.bind(this)}/>            
          </div>)];
       default:
        return [
            (<div className="site-breadcrumb"><span>Home</span></div>),
            (<div>
              <Build Build={this.state.Build} Connection={this.state.Connection} OnEraseDevice={this.eraseDevice.bind(this)}/>
              <h2>Information about {this.state.Build.Name}</h2>
              <BuildInfo Build={this.state.Build} />
            </div>)];
    }    
  }
}


export default BuildArea;
