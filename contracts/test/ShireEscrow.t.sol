// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ShireEscrow} from "../src/ShireEscrow.sol";

contract ShireEscrowTest {
    function testDeployment() public {
        ShireEscrow escrow = new ShireEscrow();
        assert(address(escrow) != address(0));
    }
}
