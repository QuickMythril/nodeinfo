document.addEventListener('DOMContentLoaded', function() {
    const currentNodeElement = document.getElementById("currentNode");
    // Display the current node IP address or URL
    if (currentNodeElement) {
        currentNodeElement.textContent = window.location.host;
    }
    const buildVersionEl = document.getElementById('buildVersion');
    const uptimeEl = document.getElementById('uptime');
    const blockHeightEl = document.getElementById('blockHeight');
    const connectionsEl = document.getElementById('connections');
    const syncPercentEl = document.getElementById('syncPercent');
    const mintingStatusEl = document.getElementById('mintingStatus');
    const mintingAccountsEl = document.getElementById('mintingAccounts');
    const incomingCountEl = document.getElementById('incomingCount');
    const outgoingCountEl = document.getElementById('outgoingCount');
    const incomingPeersTable = document.getElementById('incomingPeers').getElementsByTagName('tbody')[0];
    const outgoingPeersTable = document.getElementById('outgoingPeers').getElementsByTagName('tbody')[0];
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const refreshRateInput = document.getElementById('refreshRate');
    const refreshValueEl = document.getElementById('refreshValue');
    // Control Buttons
    const stopButton = document.getElementById('stopButton');
    const restartButton = document.getElementById('restartButton');
    const bootstrapButton = document.getElementById('bootstrapButton');
    // Event Listeners for Control Buttons
    stopButton.addEventListener('click', () => handleAdminAction('stop'));
    restartButton.addEventListener('click', () => handleAdminAction('restart'));
    bootstrapButton.addEventListener('click', () => handleAdminAction('bootstrap'));
    // Add event listeners for '+' buttons
    const addPeerButton = document.getElementById('addPeerButton');
    const addMintingAccountButton = document.getElementById('addMintingAccountButton');
    addPeerButton.addEventListener('click', () => {
        addPeerModal.style.display = 'block';
    });
    addMintingAccountButton.addEventListener('click', () => {
        addMintingAccountModal.style.display = 'block';
    });
    // Modals for Adding Peer and Minting Account
    const addPeerModal = document.getElementById('addPeerModal');
    const addMintingAccountModal = document.getElementById('addMintingAccountModal');
    const closeAddPeerModal = document.getElementById('closeAddPeerModal');
    const closeAddMintingAccountModal = document.getElementById('closeAddMintingAccountModal');
    const newPeerInput = document.getElementById('newPeerInput');
    const submitNewPeerButton = document.getElementById('submitNewPeerButton');
    const newMintingAccountInput = document.getElementById('newMintingAccountInput');
    const submitNewMintingAccountButton = document.getElementById('submitNewMintingAccountButton');
    // Close Modals
    closeAddPeerModal.addEventListener('click', () => {
        addPeerModal.style.display = 'none';
    });
    closeAddMintingAccountModal.addEventListener('click', () => {
        addMintingAccountModal.style.display = 'none';
    });
    // Submit New Peer
    submitNewPeerButton.addEventListener('click', () => {
        const peerAddress = newPeerInput.value.trim();
        if (peerAddress) {
            handleAddPeer(peerAddress);
            newPeerInput.value = '';
            addPeerModal.style.display = 'none';
        }
    });
    // Submit New Minting Account
    submitNewMintingAccountButton.addEventListener('click', () => {
        const accountAddress = newMintingAccountInput.value.trim();
        if (accountAddress) {
            handleAddMintingAccount(accountAddress);
            newMintingAccountInput.value = '';
            addMintingAccountModal.style.display = 'none';
        }
    });
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target == addPeerModal) {
            addPeerModal.style.display = 'none';
        }
        if (event.target == addMintingAccountModal) {
            addMintingAccountModal.style.display = 'none';
        }
    });
    let peersData = [];
    let incomingPeers = [];
    let outgoingPeers = [];
    let sortOrder = {
        incoming: { column: 'address', ascending: true },
        outgoing: { column: 'address', ascending: true }
    };
    let refreshRate = 10000; // Default 10 seconds
    let intervalId;

    function fetchNodeInfo() {
        fetch('/admin/info')
            .then(response => response.json())
            .then(data => {
                buildVersionEl.textContent = data.buildVersion;
                uptimeEl.textContent = formatUptime(data.uptime);
            })
            .catch(error => console.error('Error fetching /admin/info:', error));
        fetch('/admin/status')
            .then(response => response.json())
            .then(data => {
                blockHeightEl.textContent = data.height;
                connectionsEl.textContent = data.numberOfConnections;
                syncPercentEl.textContent = data.syncPercent + '%';
                mintingStatusEl.textContent = data.isMintingPossible ? 'Minting' : 'Not Minting';
            })
            .catch(error => console.error('Error fetching /admin/status:', error));
        fetchMintingAccounts();
    }

    function fetchMintingAccounts() {
        fetch('/admin/mintingaccounts')
            .then(response => response.json())
            .then(async (data) => {
                mintingAccountsEl.innerHTML = '';
                for (const account of data) {
                    if (account.mintingAccount === account.recipientAccount) {
                        const address = account.mintingAccount;
                        const nameInfo = await fetch(`/names/address/${address}`).then(res => res.json());
                        let name = 'No Registered Name';
                        let avatarImg = '';
                        if (nameInfo && nameInfo.length > 0) {
                            name = nameInfo[0].name;
                            // Check for avatar image
                            const avatarUrl = `/arbitrary/THUMBNAIL/${encodeURIComponent(name)}/qortal_avatar`;
                            try {
                                const avatarResponse = await fetch(avatarUrl);
                                if (avatarResponse.ok) {
                                    avatarImg = avatarUrl;
                                }
                            } catch (error) {
                                console.error('Error fetching avatar:', error);
                            }
                        }
                        const accountDiv = document.createElement('div');
                        accountDiv.className = 'minting-account';
                        // Create remove button
                        const removeButton = document.createElement('button');
                        removeButton.className = 'remove-button';
                        removeButton.textContent = 'X';
                        removeButton.addEventListener('click', () => {
                            handleRemoveMintingAccount(account.publicKey);
                        });
                        accountDiv.appendChild(removeButton);
                        if (avatarImg) {
                            const img = document.createElement('img');
                            img.src = avatarImg;
                            img.alt = name;
                            accountDiv.appendChild(img);
                        }
                        const infoDiv = document.createElement('div');
                        infoDiv.innerHTML = `<strong>Name:</strong> ${name}<br><strong>Address:</strong> ${address}`;
                        accountDiv.appendChild(infoDiv);
                        mintingAccountsEl.appendChild(accountDiv);
                    }
                }
            })
            .catch(error => console.error('Error fetching /admin/mintingaccounts:', error));
    }

    function fetchPeers() {
        fetch('/peers')
            .then(response => response.json())
            .then(data => {
                peersData = data;
                updatePeerTables();
            })
            .catch(error => console.error('Error fetching /peers:', error));
    }

    function updatePeerTables() {
        incomingPeers = peersData.filter(peer => peer.direction === 'INBOUND');
        outgoingPeers = peersData.filter(peer => peer.direction === 'OUTBOUND');
        incomingCountEl.textContent = incomingPeers.length;
        outgoingCountEl.textContent = outgoingPeers.length;
        renderPeerTable('incoming', incomingPeersTable, incomingPeers);
        renderPeerTable('outgoing', outgoingPeersTable, outgoingPeers);
    }

    function renderPeerTable(type, tableBody, peers) {
        const sort = sortOrder[type];
        peers.sort((a, b) => {
            let valA = a[sort.column];
            let valB = b[sort.column];
            if (sort.column === 'connectedFor') {
                valA = getDurationInSeconds(a.connectedWhen);
                valB = getDurationInSeconds(b.connectedWhen);
            } else if (sort.column === 'lastHeight') {
                valA = parseInt(valA) || 0;
                valB = parseInt(valB) || 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            if (valA < valB) return sort.ascending ? -1 : 1;
            if (valA > valB) return sort.ascending ? 1 : -1;
            return 0;
        });
        tableBody.innerHTML = '';
        peers.forEach(peer => {
            const row = tableBody.insertRow();
            // Address cell with buttons
            const addressCell = row.insertCell();
            // Remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-button';
            removeButton.textContent = 'X';
            removeButton.addEventListener('click', () => {
                handleRemovePeer(peer.address);
            });
            addressCell.appendChild(removeButton);
            // Force Sync button
            const forceSyncButton = document.createElement('button');
            forceSyncButton.className = 'force-sync-button';
            forceSyncButton.textContent = '⟳'; // Sync symbol
            forceSyncButton.addEventListener('click', () => {
                handleForceSync(peer.address);
            });
            addressCell.appendChild(forceSyncButton);
            // Address text
            const addressText = document.createTextNode(peer.address || '');
            addressCell.appendChild(addressText);
            // Other cells
            row.insertCell().textContent = peer.handshakeStatus || '';
            row.insertCell().textContent = calculateConnectedFor(peer.connectedWhen) || '';
            row.insertCell().textContent = peer.version || '';
            row.insertCell().textContent = peer.lastHeight || '';
        });
    }

    function calculateConnectedFor(connectedWhen) {
        if (!connectedWhen) return '';
        const now = Date.now();
        const durationMillis = now - connectedWhen;
        return formatDuration(durationMillis);
    }

    function formatDuration(durationMillis) {
        let seconds = Math.floor(durationMillis / 1000);
        let days = Math.floor(seconds / (3600 * 24));
        seconds -= days * 3600 * 24;
        let hrs = Math.floor(seconds / 3600);
        seconds -= hrs * 3600;
        let mins = Math.floor(seconds / 60);
        seconds -= mins * 60;
        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hrs > 0) parts.push(`${hrs}h`);
        if (mins > 0) parts.push(`${mins}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        return parts.join(' ');
    }

    function getDurationInSeconds(connectedWhen) {
        if (!connectedWhen) return 0;
        const now = Date.now();
        const durationMillis = now - connectedWhen;
        return Math.floor(durationMillis / 1000);
    }

    function formatUptime(uptimeMillis) {
        let seconds = Math.floor(uptimeMillis / 1000);
        let days = Math.floor(seconds / (3600 * 24));
        seconds -= days * 3600 * 24;
        let hrs = Math.floor(seconds / 3600);
        seconds -= hrs * 3600;
        let mnts = Math.floor(seconds / 60);
        seconds -= mnts * 60;
        return `${days}d ${hrs}h ${mnts}m ${seconds}s`;
    }

    function setupSorting() {
        const incomingHeaders = document.querySelectorAll('#incomingPeers th');
        const outgoingHeaders = document.querySelectorAll('#outgoingPeers th');
        incomingHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                if (sortOrder.incoming.column === column) {
                    sortOrder.incoming.ascending = !sortOrder.incoming.ascending;
                } else {
                    sortOrder.incoming.column = column;
                    sortOrder.incoming.ascending = true;
                }
                renderPeerTable('incoming', incomingPeersTable, incomingPeers);
            });
        });
        outgoingHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                if (sortOrder.outgoing.column === column) {
                    sortOrder.outgoing.ascending = !sortOrder.outgoing.ascending;
                } else {
                    sortOrder.outgoing.column = column;
                    sortOrder.outgoing.ascending = true;
                }
                renderPeerTable('outgoing', outgoingPeersTable, outgoingPeers);
            });
        });
    }

    function setupSettings() {
        settingsButton.addEventListener('click', () => {
            settingsModal.style.display = 'block';
        });
        closeModal.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        refreshRateInput.addEventListener('input', () => {
            const value = refreshRateInput.value;
            refreshValueEl.textContent = value;
            refreshRate = value * 1000; // Convert to milliseconds
            clearInterval(intervalId);
            intervalId = setInterval(() => {
                fetchNodeInfo();
                fetchPeers();
            }, refreshRate);
        });
    }

    async function handleAdminAction(action) {
        try {
            const response = await qortalRequest({ action: "ADMIN_ACTION", type: action });
            alert(`Successfully executed ${action} action.`);
        } catch (error) {
            console.error(`Error executing ${action} action:`, error);
            alert(`Error executing ${action} action: ${error.message || error}`);
        }
    }

    async function handleAddPeer(peerAddress) {
        try {
            await qortalRequest({ action: "ADMIN_ACTION", type: "addpeer", value: peerAddress });
            alert(`Successfully added peer ${peerAddress}.`);
            fetchPeers(); // Refresh the peers list
        } catch (error) {
            console.error(`Error adding peer ${peerAddress}:`, error);
            alert(`Error adding peer: ${error.message || error}`);
        }
    }

    async function handleRemovePeer(peerAddress) {
        try {
            await qortalRequest({ action: "ADMIN_ACTION", type: "removepeer", value: peerAddress });
            alert(`Successfully removed peer ${peerAddress}.`);
            fetchPeers(); // Refresh the peers list
        } catch (error) {
            console.error(`Error removing peer ${peerAddress}:`, error);
            alert(`Error removing peer: ${error.message || error}`);
        }
    }

    async function handleForceSync(peerAddress) {
        try {
            await qortalRequest({ action: "ADMIN_ACTION", type: "forcesync", value: peerAddress });
            alert(`Successfully forced sync to peer ${peerAddress}.`);
            // Optionally refresh peer data
        } catch (error) {
            console.error(`Error forcing sync to peer ${peerAddress}:`, error);
            alert(`Error forcing sync to peer: ${error.message || error}`);
        }
    }

    async function handleAddMintingAccount(accountAddress) {
        try {
            await qortalRequest({ action: "ADMIN_ACTION", type: "addmintingaccount", value: accountAddress });
            alert(`Successfully added minting account ${accountAddress}.`);
            fetchMintingAccounts(); // Refresh the minting accounts list
        } catch (error) {
            console.error(`Error adding minting account ${accountAddress}:`, error);
            alert(`Error adding minting account: ${error.message || error}`);
        }
    }

    async function handleRemoveMintingAccount(accountAddress) {
        try {
            await qortalRequest({ action: "ADMIN_ACTION", type: "removemintingaccount", value: accountAddress });
            alert(`Successfully removed minting account ${accountAddress}.`);
            fetchMintingAccounts(); // Refresh the minting accounts list
        } catch (error) {
            console.error(`Error removing minting account ${accountAddress}:`, error);
            alert(`Error removing minting account: ${error.message || error}`);
        }
    }

    // Handle clicking outside the modals
    window.addEventListener('click', (event) => {
        if (event.target == settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Initial fetch
    fetchNodeInfo();
    fetchPeers();

    // Regular updates
    intervalId = setInterval(() => {
        fetchNodeInfo();
        fetchPeers();
    }, refreshRate);

    setupSorting();
    setupSettings();
});
