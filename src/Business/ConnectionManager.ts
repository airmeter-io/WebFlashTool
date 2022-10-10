import { Transport } from '../esptool-js/webserial.js'
import { ESPLoader } from '../esptool-js/ESPLoader.js'
import { ESPError } from '../esptool-js/error.js'
import { Terminal} from 'xterm'
import {Md5} from 'ts-md5';
import {toInt, toIntBytes, toHex, fromHexToDest} from '../Utility/BitConvert.ts'
import CryptoES from 'crypto-es';

interface IConnectionInfo {
   chip : string;
   chipShort : string;
   features : string[];
   freq : number;
   flashId : number;
   flashSize : number;
   mac : string;
}


class ConnectionManager {
    _terminal : Terminal;
    _transport : Transport;
    _esploader : ESPLoader;
    _device : SerialPort = null;
    _connected : boolean;

    constructor(pTerminal : Terminal) {
        this._terminal = pTerminal;
        this._connected = false;
    }

    async writeFlash(pData : Uint8Array, pAddress : number, pReportProgress : (number)=>void) {
      const toBinString = async (bytes : Uint8Array) =>{
         var blob  = new Blob([bytes]);
         const reader = new FileReader();
        
          reader.onload = () => {
             
          }

           reader.readAsBinaryString(blob);

           while(reader.result===null) {
            await this._esploader._sleep(144);
           }
           return reader.result;
      }
      await this._esploader.write_flash({
        fileArray: [ { data: await toBinString(pData), address:pAddress }],
        flash_size: 'keep',
        reportProgress: (fileIndex, written, total)=> {
            pReportProgress(written / total * 100 );
        },
        calculateMD5Hash: (image) => {
          return CryptoES.MD5(CryptoES.enc.Latin1.parse(image));
        }
    });
    } 

    async eraseFullFlash() {
      await this._esploader.erase_flash();
    }

    async readFlash(pAddr : number, pLength : number, pUpdateProgress : (number)=>void) {
      var ESP_READ_REG = 0xd2;
      var val, data;
      var pkt = this._esploader._int_to_bytearray(pAddr);
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(pLength));
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(0x1000));
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(64));
      val = await this._esploader.command({op:ESP_READ_REG, data:pkt, timeout:30000});
      var result = new Uint8Array();
   
      pUpdateProgress(0);
      var curKBs = 0;
      while (result.length<pLength) {
        try {
            const res = await this._transport.read({timeout: 1000});
            result = this._esploader._appendArray(result, res);
            if(res.length>0) {
              await this._esploader.transport.write(this._esploader._int_to_bytearray(result.length));
              var newKBs = Math.floor(result.length/1024);
              if(curKBs != newKBs) {
                curKBs = newKBs;
                pUpdateProgress(Math.floor((result.length/pLength)*100));
              }
            }
        } catch (e) {
           // break;
        }
      //  await this._esploader._sleep(50);
      }
      pUpdateProgress(100);
      var hash = new Uint8Array();
      while(hash.length<16) {
        try {
        const res = await this._transport.read({timeout: 1000});
        hash = this._esploader._appendArray(hash, res);
        
        } catch(exception) {
           break;
        }
      }

      if(hash.length<16)
        throw Error("Invalid MD5 on flash data read");
      var md5 = new Md5();
      md5.appendByteArray(result);                
      var calcedMd5 = md5.end();
     
      var presMd5 =toHex(hash);
      if(calcedMd5!==presMd5)
        throw Error("MD5 did not match on data read from flash");

      return result;
    }

    async disconnect() {
      if(this._device!=null) {
        try {
           await this._device.close();
        } catch(exception) {

        }
        this._device = null;
      }
    }
    
    
    
    async flash_set_parameters(pFlashSize : number) {
      const ESP_SPI_SET_PARAMS = 0x0B;
      var pkt : Uint8Array = this._esploader._int_to_bytearray(0);
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(pFlashSize));
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(64*1024)); //block size
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(4*1024)); // sector size
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(256)); // page size
      pkt = this._esploader._appendArray(pkt, this._esploader._int_to_bytearray(0xffff)); // status mask
      await this._esploader.check_command({op_description: "configuring SPI params", op: ESP_SPI_SET_PARAMS, data: pkt});
  } 
  
    private DETECTED_FLASH_SIZES = {0x12: 256*1024, 0x13: 512*1024, 0x14: 1024*1024, 0x15: 2*1024*1024, 0x16: 4*1024*1024, 0x17: 8*1024*1024, 0x18: 16*1024*1024};
    async connect() : Promise<IConnectionInfo> {
      if (this._device === null) {
        if(this._terminal!=null)
          this._terminal.writeln("Requesting port...");
        try  {
          this._device = await navigator.serial.requestPort({ });   
        } catch(exception) {
          throw new Error();
        }
        this._transport = new Transport(this._device);
  
        try {
          this._esploader = new ESPLoader(this._transport,921600, this._terminal);
          
          
          await this._esploader.detect_chip({mode: 'default_reset'});
          var chip = await this._esploader.chip.get_chip_description(this._esploader);
          var features = await this._esploader.chip.get_chip_features(this._esploader);
          var freq = await this._esploader.chip.get_crystal_freq(this._esploader);
          var mac = await this._esploader.chip.read_mac(this._esploader);
  
          if (typeof(this._esploader.chip._post_connect) != 'undefined') {
            await this._esploader.chip._post_connect(this._esploader);
          }
          await this._esploader.run_stub();
          var flashId = await this._esploader.read_flash_id();
          
          
          
          var flid_lowbyte = (flashId >> 16) & 0xff;
  
          var flashSize = this.DETECTED_FLASH_SIZES[flid_lowbyte]
          this._esploader.log("Chip is " + chip);    
          this._esploader.log("Features: " + features);      
          this._esploader.log("Crystal is " + freq + "MHz");      
          this._esploader.log("MAC: " + mac);
          this._esploader.log("FlashID: " + flashId);
          this._esploader.log("FlashSize: " + flashSize);

         
          await this.flash_set_parameters(flashSize);
          await this._esploader.flash_spi_attach(0);
  
          await this._esploader.change_baud();
          var chipSplit = chip.split(" ");
          return {
            chip: chip,
            chipShort: chipSplit[0],
            features: features,
            freq: freq,
            flashId: flashId,
            flashSize: flashSize,
            mac: mac
          };
        } catch(exception) {
          
          
          this._terminal.writeln("\nERROR: " + exception.message);
        }
  
        if(this._device!=null) {
          try {
             await this._device.close();
          } catch(exception) {
  
          }
          this._device = null;
        }
  
  
      } else {
        if(this._terminal!=null)
            this._terminal.writeln("Already setup device.");
      
      }
      throw new Error();
    }
  }
  export {ConnectionManager, IConnectionInfo};