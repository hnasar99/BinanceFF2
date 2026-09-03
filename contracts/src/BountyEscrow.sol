// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {function transfer(address,uint256) external returns(bool);function transferFrom(address,address,uint256) external returns(bool);}

/// @notice Minimal non-custodial escrow for verified agent work. Use ERC-8183 for protocol-level jobs.
contract BountyEscrow {
    enum Status{Open,Assigned,Submitted,Released,Refunded}
    struct Bounty{address sponsor;address agent;address token;uint128 amount;uint64 deadline;bytes32 evidence;Status status;}
    uint256 public nextBountyId=1; mapping(uint256=>Bounty) public bounties; uint256 private locked=1;
    event BountyCreated(uint256 indexed id,address indexed sponsor,address token,uint256 amount,uint64 deadline);
    event Assigned(uint256 indexed id,address indexed agent); event Submitted(uint256 indexed id,bytes32 evidence);
    event Released(uint256 indexed id,address indexed agent,uint256 amount); event Refunded(uint256 indexed id,uint256 amount);
    error Unauthorized(); error InvalidState(); error TransferFailed();
    modifier nonReentrant(){require(locked==1,"reentrant");locked=2;_;locked=1;}

    function create(address token,uint128 amount,uint64 deadline) external payable nonReentrant returns(uint256 id){
        require(amount>0&&deadline>block.timestamp,"invalid bounty"); id=nextBountyId++;
        if(token==address(0)){require(msg.value==amount,"value mismatch");}else{require(msg.value==0,"native not accepted");if(!IERC20(token).transferFrom(msg.sender,address(this),amount))revert TransferFailed();}
        bounties[id]=Bounty(msg.sender,address(0),token,amount,deadline,bytes32(0),Status.Open);emit BountyCreated(id,msg.sender,token,amount,deadline);
    }
    function assign(uint256 id,address agent) external {Bounty storage b=bounties[id];if(msg.sender!=b.sponsor)revert Unauthorized();if(b.status!=Status.Open||agent==address(0))revert InvalidState();b.agent=agent;b.status=Status.Assigned;emit Assigned(id,agent);}
    function submit(uint256 id,bytes32 evidenceDigest) external {Bounty storage b=bounties[id];if(msg.sender!=b.agent)revert Unauthorized();if(b.status!=Status.Assigned||block.timestamp>b.deadline||evidenceDigest==bytes32(0))revert InvalidState();b.evidence=evidenceDigest;b.status=Status.Submitted;emit Submitted(id,evidenceDigest);}
    function approve(uint256 id) external nonReentrant {Bounty storage b=bounties[id];if(msg.sender!=b.sponsor)revert Unauthorized();if(b.status!=Status.Submitted)revert InvalidState();b.status=Status.Released;_pay(b.token,b.agent,b.amount);emit Released(id,b.agent,b.amount);}
    function refund(uint256 id) external nonReentrant {Bounty storage b=bounties[id];if(msg.sender!=b.sponsor)revert Unauthorized();if(block.timestamp<=b.deadline||b.status==Status.Released||b.status==Status.Refunded)revert InvalidState();b.status=Status.Refunded;_pay(b.token,b.sponsor,b.amount);emit Refunded(id,b.amount);}
    function _pay(address token,address to,uint256 amount) private {if(token==address(0)){(bool ok,)=to.call{value:amount}("");if(!ok)revert TransferFailed();}else if(!IERC20(token).transfer(to,amount))revert TransferFailed();}
}
