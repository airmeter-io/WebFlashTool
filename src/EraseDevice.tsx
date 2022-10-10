import './App.css';

import React from 'react';
import {BuildManager} from './Business/BuildManager.ts'
import {SuccessMessage} from './Messages/Success.tsx'
import {WarningMessage} from './Messages/Warning.tsx'
import {ErrorMessage} from './Messages/Error.tsx'
import { IConnectionChangeInfo} from './Connect.tsx'
import { PartitionTable  } from './Business/PartitionTable.ts';


interface IEraseFlashProps {
    Build : BuildManager;
    Connection : IConnectionChangeInfo | null;
    OnClose : () => void;
}

enum EraseState {
   NotStarted,
   Erasing,
   Failed,
   Erased
};

interface IEraseFlashState {
  message : string;
  state:  EraseState;
  currentPartitionTable : PartitionTable | null ;
}

class EraseDevice extends React.Component<IEraseFlashProps, IEraseFlashState> {

  constructor(props) {
    super(props);

  }

  update(pMessage) {
    this.setState({ 
      message: pMessage      
   });
  }

  failed(pMessage) {
    this.setState({ 
      state: EraseState.Failed,
      message: pMessage
   });
  }


  async delay(ms: number) {
    await new Promise(resolve => setTimeout(()=>resolve(), ms)).then(()=>console.log("fired"));
}


  async componentDidUpdate(prevProps) {
    if (prevProps.Build.Name !== this.props.Build.Name) {
 
      this.setState( { state: EraseState.NotStarted});
     
    }
  }

  async componentDidMount () {

    if(this.props.Build!==null) {
       this.setState(  { state: EraseState.NotStarted});
     }
  }

  async componentWillUnmount () {
    
  }

  handleClose(event) {
    event.preventDefault();
    this.props.OnClose();
  }

  async handleErase(event) {
    event.preventDefault();
    this.setState(  { state: EraseState.Erasing});
    try {
      await this.props.Connection.connection.eraseFullFlash();
    } catch(exception) {
      this.failed(exception.toString());
      return;
    }
    this.setState(  { state: EraseState.Erased});
  }
  render() {
    if(this.state === null) return (<div></div>);

    switch(this.state.state) {
        case EraseState.Failed:
          return (<ErrorMessage Title="Failed to erase flash memory" Message={ this.state.message }/>);
        case EraseState.NotStarted:
          return (
            <div>
               <ErrorMessage Title="Data WILL be destroyed" Message="Continuing with this operation is non-reversible and any data on the device will be permanently destroyed."/>  
               <div className="flashActions">
                  <div className="secondaryBtn" onClick={this.handleErase.bind(this)}>Erase All</div>
                  <div onClick={this.handleClose.bind(this)} className="primaryBtn">Cancel</div>
                </div>
            </div>
          );
        case EraseState.Erasing:
            return (
              <div>
                 <WarningMessage Title="Data is being erased." Message="The device is being erased at the moment please wait."/>  
                
              </div>
            );
        case EraseState.Erased :
          return (
            <div>
              <SuccessMessage Title="Fully Erased Flash" Message="The flash memory has been fully erased. You may now flash the device with firmware again."/>  
              <div className="flashActions">
                  <div onClick={this.handleClose.bind(this)} className="primaryBtn">Close</div>
              </div>
            </div>
          );
    }
  
  }
}


export {EraseDevice};
