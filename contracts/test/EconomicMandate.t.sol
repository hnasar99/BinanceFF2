// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../src/EconomicMandate.sol";

contract EconomicMandateTest {
    EconomicMandate mandate=new EconomicMandate();
    function testCreateAndConsume() public {bytes4[] memory allowed=new bytes4[](1);allowed[0]=bytes4(keccak256("execute()"));uint256 id=mandate.createMandate(address(this),100,uint64(block.timestamp+1 days),allowed);mandate.consume(id,allowed[0],40);(,,,uint128 remaining,,)=_read(id);require(remaining==60,"remaining budget");}
    function _read(uint256 id) private view returns(address owner,address agent,uint64 expiry,uint128 remaining,bool revoked,bool selector){(owner,agent,remaining,expiry,revoked)=mandate.mandates(id);selector=mandate.allowedSelector(id,bytes4(keccak256("execute()")));}
}
