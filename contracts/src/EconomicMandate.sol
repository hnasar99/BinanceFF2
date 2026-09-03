// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Revocable, budget-capped authority for autonomous agent execution.
contract EconomicMandate {
    struct Mandate { address owner; address agent; uint128 remaining; uint64 expiresAt; bool revoked; }
    uint256 public nextMandateId = 1;
    mapping(uint256 => Mandate) public mandates;
    mapping(uint256 => mapping(bytes4 => bool)) public allowedSelector;
    event MandateCreated(uint256 indexed id,address indexed owner,address indexed agent,uint256 budget,uint64 expiresAt);
    event AuthorityConsumed(uint256 indexed id,bytes4 indexed selector,uint256 amount);
    event MandateRevoked(uint256 indexed id);

    error Unauthorized(); error Expired(); error Revoked(); error ActionDenied(); error BudgetExceeded();

    function createMandate(address agent,uint128 budget,uint64 expiresAt,bytes4[] calldata selectors) external returns(uint256 id){
        require(agent!=address(0)&&expiresAt>block.timestamp,"invalid mandate");
        id=nextMandateId++; mandates[id]=Mandate(msg.sender,agent,budget,expiresAt,false);
        for(uint256 i;i<selectors.length;i++) allowedSelector[id][selectors[i]]=true;
        emit MandateCreated(id,msg.sender,agent,budget,expiresAt);
    }
    function consume(uint256 id,bytes4 selector,uint128 amount) external {
        Mandate storage m=mandates[id]; if(msg.sender!=m.agent)revert Unauthorized(); if(m.revoked)revert Revoked();
        if(block.timestamp>=m.expiresAt)revert Expired(); if(!allowedSelector[id][selector])revert ActionDenied();
        if(amount>m.remaining)revert BudgetExceeded(); unchecked{m.remaining-=amount;} emit AuthorityConsumed(id,selector,amount);
    }
    function revoke(uint256 id) external {Mandate storage m=mandates[id];if(msg.sender!=m.owner)revert Unauthorized();m.revoked=true;emit MandateRevoked(id);}
    function valid(uint256 id,address agent,bytes4 selector,uint128 amount) external view returns(bool){Mandate memory m=mandates[id];return m.owner!=address(0)&&m.agent==agent&&!m.revoked&&block.timestamp<m.expiresAt&&allowedSelector[id][selector]&&amount<=m.remaining;}
}
