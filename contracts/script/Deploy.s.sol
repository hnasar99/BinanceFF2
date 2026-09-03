// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../src/EconomicMandate.sol";
import "../src/BountyEscrow.sol";

interface Vm {function startBroadcast() external;function stopBroadcast() external;}
contract Deploy {
    Vm constant vm=Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function run() external returns(EconomicMandate mandate,BountyEscrow escrow){vm.startBroadcast();mandate=new EconomicMandate();escrow=new BountyEscrow();vm.stopBroadcast();}
}
