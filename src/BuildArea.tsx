import './App.css';

import React from 'react';
import {BuildManager} from './Business/BuildManager.ts'
import {SuccessMessage} from './Messages/Success.tsx'
import {WarningMessage} from './Messages/Warning.tsx'
import {ErrorMessage} from './Messages/Error.tsx'
import Build from './Build.tsx';
import BuildInfo from './BuildInfo.tsx';
import { Connect, IConnectionChangeInfo} from './Connect.tsx'

interface IBuildAreaProps {
   
}

interface IBuildAreaState {
  Build : BuildManager | null;
  Connection: IConnectionChangeInfo | null;
}

class BuildArea extends React.Component<IBuildAreaProps, IBuildAreaState> {
 
  constructor(props) {
    super(props);
  
  }


  componentDidMount () {
    this.setState({ Build: null });
  }

   setBuild(pBuild : BuildManager | null, pConnection : IConnectionChangeInfo | null) {
      this.setState({ Build: pBuild, Connection: pConnection });
   }

  render() {
    if(this.state == null || this.state.Build===null){
      return (
        <WarningMessage Title="No available build" 
                      Message="Please connect a compatible ESP32 device by USB to your computer and use the connect button to start."/>
      );
    }
    return (<div>
        <Build Build={this.state.Build} Connection={this.state.Connection}/>
        <h2>Information about {this.state.Build.Name}</h2>
        <BuildInfo Build={this.state.Build} />
      </div>    
    );
  }
}


export default BuildArea;
