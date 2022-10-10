import './App.css';

import React from 'react';
import {BuildManager, IBuildFile, IManifestBuildPart } from './Business/BuildManager.ts'
import { Connect, IConnectionChangeInfo} from './Connect.tsx'
import { PartitionTable  } from './Business/PartitionTable.ts';
import { BoardManager } from './Business/BoardManager.ts';
import { BuildPartitionStage } from './BuildPartitions.tsx';
import { compareBytes, getReadableFileSizeString } from './Utility/BitConvert.ts';
import { BuildPartitionProgress } from './BuildPartitionProgress.tsx';
import { idText, isThisTypeNode, textChangeRangeIsUnchanged } from 'typescript';
import { Md5 } from 'ts-md5';




interface IBuildPartitionProps {
    Build : BuildManager;
    Connection : IConnectionChangeInfo | null;
    PartitionTable : PartitionTable;
    Stage : BuildPartitionStage;
    BuildPart : IManifestBuildPart;
    BuildFile : IBuildFile;
}


enum BuildPartitionStep {
  Waiting, 
  Downloading,
  UpToDate,
  NeedsFlash,
  PendingFlash,
  Flashing,
  Verifying
};

interface IBuildPartitionState {
  step : BuildPartitionStep;
  done : number;
}

class BuildPartition extends React.Component<IBuildPartitionProps, IBuildPartitionState> {
 
  constructor(props) {
    super(props);
    this.setState({step: BuildPartitionStep.Waiting, done: 0});
   
  }

  isOta() {
    return this.props.BuildPart.path=== "ota_data_initial.bin";
  }


  async donePercent(pDone : number) {
    this.setState( { done: pDone });
  }

  async downloadAndProcess() {
  //  if(this.state.step != BuildPartitionStep.Waiting) throw Error("Wrong step to be downloading");

    this.setState( { step: BuildPartitionStep.Downloading, done: 0 });
    var data = await this.props.Connection.connection.readFlash(
      this.props.BuildPart.offset,
      this.getPartitionSize(),
      this.donePercent.bind(this));
    if(compareBytes(this.props.BuildFile.data,data)) {
      this.setState( { step: BuildPartitionStep.UpToDate});
      return true;
    } else 
    {
      this.setState( { step: BuildPartitionStep.NeedsFlash});
      return  this.isOta();
    }
  }

  async updateForFlash() {
    if(this.state.step === BuildPartitionStep.NeedsFlash) {
      this.setState( { step: BuildPartitionStep.PendingFlash});
    }
  }

  async flash() {
    if(this.state.step === BuildPartitionStep.NeedsFlash || this.state.step ===BuildPartitionStep.PendingFlash) {
      this.setState({ done: 0, step: BuildPartitionStep.Flashing });
      await this.props.Connection.connection.writeFlash(
       this.props.BuildFile.data, this.props.BuildPart.offset,
        (pDone) => this.setState({ done: pDone }));

      return await this.downloadAndProcess();
    }
    return true;
  }
  
  async componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
    
    }
  }

  async componentDidMount () {
    this.setState({step: BuildPartitionStep.Waiting});
    if(this.props.Build!==null) {
   
     }
  }

  getPartitionSize() : number {
    if(this.props.BuildPart.offset == 0x1000) return 0x7000;
    if(this.props.BuildPart.offset == 0x8000) return 3072;
    var partition = this.props.PartitionTable.getByOffset(this.props.BuildPart.offset);
    return partition.Size;
  }


  
  async componentWillUnmount () {
    
  }




  renderStatus() {
    switch(this.state === null ? BuildPartitionStep.Waiting :  this.state.step) {
      case BuildPartitionStep.Waiting :
        return (          
            <td className="partitionStatus">
              <BuildPartitionProgress Title="Pending" Value={0} />  
            </td>
          );     
      case BuildPartitionStep.Downloading :
        return (          
            <td className="partitionStatus">
              <BuildPartitionProgress Title="Reading from device" Value={this.state.done} />              
            </td>); 
      case BuildPartitionStep.UpToDate :
        return (
            <td className="partitionStatus">
              Up to date <svg className="partitionStatusImg"  viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.612 15.921L7.11133 12.421L8.32429 11.2086L10.612 13.4963L15.6868 8.42578L16.8998 9.63816L10.612 15.921Z" fill="#599455"/>
<path d="M12.0048 22C6.4888 22 2 17.5143 2 12C2 6.48571 6.4888 2 12.0048 2C17.5217 2 22.0095 6.48571 22.0095 12C22.0095 17.5143 17.5217 22 12.0048 22ZM12.0048 3.71429C7.43306 3.71429 3.7151 7.43048 3.7151 12C3.7151 16.5695 7.43306 20.2857 12.0048 20.2857C16.5765 20.2857 20.2944 16.5695 20.2944 12C20.2944 7.43048 16.5765 3.71429 12.0048 3.71429V3.71429Z" fill="#599455"/>
</svg>
            </td>
          );
      case BuildPartitionStep.NeedsFlash :
        if(!this.isOta())
        return (
            <td className="partitionStatus" >
              Flash required <svg className="partitionStatusImg" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0048 23C6.48785 23 2 18.5143 2 13C2 7.48571 6.48785 3 12.0048 3C17.5217 3 22.0095 7.48571 22.0095 13C22.0095 18.5143 17.5217 23 12.0048 23ZM12.0048 4.71429C7.43306 4.71429 3.7151 8.43048 3.7151 13C3.7151 17.5695 7.43306 21.2857 12.0048 21.2857C16.5765 21.2857 20.2944 17.5695 20.2944 13C20.2944 8.43048 16.5765 4.71429 12.0048 4.71429V4.71429Z" fill="#bd9331"/>
              <path d="M15.8978 10.32L14.6849 9.10767L12.0036 11.7877L9.32233 9.10767L8.10938 10.32L10.7907 13L8.10938 15.68L9.32233 16.8924L12.0036 14.2124L14.6849 16.8924L15.8978 15.68L13.2166 13L15.8978 10.32Z" fill="#bd9331"/>
              </svg>

            </td>);      
          else
            return (
              <td className="partitionStatus">
              Flash Always  <svg className="partitionStatusImg"  viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.612 15.921L7.11133 12.421L8.32429 11.2086L10.612 13.4963L15.6868 8.42578L16.8998 9.63816L10.612 15.921Z" fill="#599455"/>
    <path d="M12.0048 22C6.4888 22 2 17.5143 2 12C2 6.48571 6.4888 2 12.0048 2C17.5217 2 22.0095 6.48571 22.0095 12C22.0095 17.5143 17.5217 22 12.0048 22ZM12.0048 3.71429C7.43306 3.71429 3.7151 7.43048 3.7151 12C3.7151 16.5695 7.43306 20.2857 12.0048 20.2857C16.5765 20.2857 20.2944 16.5695 20.2944 12C20.2944 7.43048 16.5765 3.71429 12.0048 3.71429V3.71429Z" fill="#599455"/>
    </svg>
            </td>);
      case BuildPartitionStep.PendingFlash :
        return (          
            <td className="partitionStatus">
              <BuildPartitionProgress Title="Pending" Value={0} />  
            </td>
          ); 
      case BuildPartitionStep.Flashing :
            return (          
                <td className="partitionStatus">
                  <BuildPartitionProgress Title="Flashing" Value={Math.floor(this.state.done)} />  
                </td>
              );
      case BuildPartitionStep.Verifying :
              return (          
                  <td className="partitionStatus">
                    <BuildPartitionProgress Title="Verifying" Value={Math.floor(this.state.done)} />  
                  </td>
                ); 
      default : 
          throw Error();
    }
  }

  render() {
   
    return (
      <tr className="partition" key={this.props.BuildPart.Offset}>
        <td className="partitionName">
          {this.props.BuildPart.path}
        </td>
        <td className="partitionOffset">
          0x{this.props.BuildPart.offset.toString(16)}
        </td>
        <td className="partitionSize">
          {getReadableFileSizeString(this.props.BuildFile.data.length)} 
        </td>
        {this.renderStatus()}
      </tr>);   
   
  }
}


export {BuildPartition};
