import './App.css';

import React from 'react';

import {ConnectionManager} from './Business/ConnectionManager.ts'
import BuildsAvailable from './BuildsAvailable.tsx'

import { IConnectionInfo } from './Business/ConnectionManager';
import { Terminal } from 'xterm'
import {IAction, ActionPlacement} from './App.tsx';
import { BuildManager } from './Business/BuildManager.ts';
import { inflateInfo } from 'pako/lib/zlib/inflate';
import { getReadableFileSizeString } from './Utility/BitConvert.ts';
import { DeviceManager, DevicesManager } from './Business/DevicesManager.ts';

interface IConnectionChangeInfo {
  info : IConnectionInfo | null;
  connection : ConnectionManager | null;
  device : DeviceManager | null;
}

interface IConnectProps {
  Terminal : Terminal;
  OnConnectionChanged: (IConnectionChangeInfo)=>void;
}

interface IConnectState {
   connecting : boolean;
   connected : boolean;
   connection : ConnectionManager | null;
   connectionInfo : IConnectionInfo | null; 
}

class Connect extends React.Component<IConnectProps, IConnectState> {
  private _actions : IAction[];
  private _devicesManger : DevicesManager|null = null;
  logoRef : React.RefObject<any>
  
  constructor(props) {
    super(props);
   

    this.state = {  connecting: false ,connected: false, connection: null, connectionInfo: null };
  }

  async handleConnect() {
    if(this._devicesManger==null)
      this._devicesManger = new DevicesManager();
    await this._devicesManger.startup();

    if(this.state.connection == null) {
      var connection = new ConnectionManager(this.props.Terminal);      
      this.setState({ 
        connecting: true, 
        connected: false,
        connectionInfo: null,
        connection: connection
      });
      try {
        var connectionInfo = await connection.connect();
        if(connectionInfo==null)  {       
          this.setState({ 
            connecting: false, 
            connected: false,
            connectionInfo: null,
            connection: null
          });
          this.props.OnConnectionChanged({ info: null, connection: null, device: null });
        }
        else {
          
          this.setState({ 
            connecting: false,
            connected: true, 
            connectionInfo: connectionInfo
          });
      
         

          this.props.OnConnectionChanged({ info: connectionInfo, connection: connection, device: await this._devicesManger.getOrCreateDevice(connectionInfo) });
        }
      } catch (Exception) {
        this.setState({ 
          connecting: false, 
          connected: false,
          connectionInfo: null,
          connection: null
        });
        this.props.OnConnectionChanged({ info: null, connection: null, device : null });
      }
    } else {
      await this.state.connection.disconnect();
      this.setState({ 
        connecting: false,
        connected: false, 
        connectionInfo: null,
        connection: null
      });
      this.props.OnConnectionChanged({ info: null, connection: null, device: null });
    }
    
  }

  componentDidMount () {

  }
  componentWillUnmount () {
 
  }


  render() {
    
    if(this.state.connecting) {
      return (
        <div>
            Connecting....
        </div>
      );  
    }

    if(this.state.connected) {
      return (
        <div>
            <div className='btn' onClick={this.handleConnect.bind(this)}>Disconnect</div>       
            <div>Chip: <strong>{ this.state.connectionInfo==null ? "Unknown" : this.state.connectionInfo.chipShort }</strong></div>     
            <div>Flash Size: <strong>{ this.state.connectionInfo==null ? "Unknown" : getReadableFileSizeString(this.state.connectionInfo.flashSize) }</strong></div>                 
        </div>
      );  
    }

    return (
      <div>
        <div className='btn' onClick={this.handleConnect.bind(this)}>Connect</div>       
      </div>
    );
  }
}


export {Connect, IConnectionChangeInfo};
