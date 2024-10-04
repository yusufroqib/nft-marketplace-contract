// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Lottery {
    //Entities: Manager, players and winner

    address public manager;
    address payable[] public players;
    address payable public winner;

    constructor() {
        manager = msg.sender;
    }

    function participate() public payable {
        require(msg.value == 1 ether, "Please pay 1 ether only");
        players.push(payable(msg.sender));
    }

    function getBalance() public view returns (uint256) {
        require(manager == msg.sender, "You are not the manager");
        return address(this).balance;
    }

    function random() public view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.difficulty,
                        block.timestamp,
                        players.length
                    )
                )
            );
    }

    function pickWinner() public  {
        require(manager == msg.sender, "You are not the manager");
        require(players.length >= 3, "Players  are less than 3");

        uint r = random();
        uint index = r% players.length;
        winner = players[index];
        winner.transfer(getBalance());
        players = new address payable [](0); //This will initialize the player arrays back to 0
        // return winner
    }
}
