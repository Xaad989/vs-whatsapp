import React from 'react';
import Editor from '@monaco-editor/react';
import '@vscode/codicons/dist/codicon.css';
import jsIcon from './assets/javascript.svg';

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
	const [qrImage, setQrImage] = useState(null);
	const [qrModalVisible, setQrModalVisible] = useState(false);
	const [contacts, setContacts] = useState([]);
	const activeContactRef = useRef(null);
	const editorRef = useRef(null);
	const [activeContact, setActiveContact] = useState(null);
	const [tabs, setTabs] = useState([]);
	const [editorText, setEditorText] = useState(`/*

Hello!
This is VS Whatsapp, an open-source project by Saad Sohail. Here you can see all your whatsapp chats 
in an interface that resembles that of VS Code. You can also send simple text messages to your contacts 
shown in the left sidebar.

*/`);

	const getMessages = async (chatId) => {
		try {
			setActiveContact(chatId);
			setTabs((prev) => {
				if (!prev.includes(chatId)) return [...prev, chatId];
				return prev;
			});
			console.log(activeContact);
			const response = await fetch(
				`http://localhost:4000/api/messages/${chatId}`
			);
			const data = await response.json();
			console.log('Messages:', data);
			let res = '';
			for (const item of data) {
				if (item.type === 'chat') {
					const formattedTime = new Date(
						item.timestamp * 1000
					).toLocaleString();
					if (!item.fromMe) {
						res += '{\n';
						res += '\t"message": "' + item.body + '"\n';
						res += '\t"time": "' + formattedTime + '"\n';
						res += '}\n\n';
					} else {
						// Indent entire block more (e.g., 3 tabs)
						const indent = '\t\t\t';
						res += indent + '{\n';
						res += indent + '\t"message": "' + item.body + '"\n';
						res += indent + '\t"time": "' + formattedTime + '"\n';
						res += indent + '}\n\n';
					}
				}
			}
			setEditorText(res);
		} catch (error) {
			console.error('Failed to fetch messages:', error);
		}
	};

	const sendMessage = (message) => {
		if (!activeContact) {
			console.warn('No contact selected.');
			return;
		}

		console.log(`Sending "${message}" to ${activeContact}`);

		fetch('http://localhost:4000/api/messages/send-message', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				chatId: activeContact,
				message: message,
			}),
		})
			.then((res) => res.json())
			.then((data) => {
				getMessages(activeContact);
			})
			.catch((err) => {
				console.error('Failed to send message:', err);
			});
	};

	const handleCloseTab = (tabId) => {
		setTabs((prevTabs) => prevTabs.filter((id) => id !== tabId));

		// If closing active tab, switch to another one (e.g., last opened)
		if (tabId === activeContact) {
			setActiveContact((prev) => {
				const newTabs = tabs.filter((id) => id !== tabId);
				if (newTabs.length > 0) {
					getMessages(newTabs[newTabs.length - 1]); // Load last tab
					return newTabs[newTabs.length - 1];
				} else {
					setEditorText(''); // Clear editor
					return null;
				}
			});
		}
	};

	useEffect(() => {
		socket.on('qr', (dataUrl) => {
			setQrImage(dataUrl);
			setQrModalVisible(true);
		});

		socket.on('ready', (chats) => {
			setContacts(chats);
			setQrModalVisible(false);
		});

		socket.on('message_create', async (chats) => {
			console.log(chats, activeContact);
			await getMessages(activeContactRef.current);
			setContacts(chats);
		});

		return () => {
			socket.off('qr');
			socket.off('ready');
			socket.off('message_create');
		};
	}, []);

	useEffect(() => {
		activeContactRef.current = activeContact;
	}, [activeContact]);

	useEffect(() => {
		if (editorRef.current) {
			const editor = editorRef.current;
			const lineCount = editor.getModel().getLineCount();
			editor.revealLine(lineCount);
		}
	}, [editorText]);

	return (
		<>
			{qrModalVisible && (
				<div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50'>
					<div className='bg-[#1e1e1e] p-6 shadow-xl text-white max-w-sm w-full text-center'>
						<h2 className='text-lg font-semibold mb-4'>
							Scan QR through Whatsapp {'>'} Linked Devices
						</h2>
						<img src={qrImage} alt='QR Code' className='mx-auto mb-4' />
						<button
							onClick={() => setQrModalVisible(false)}
							className='mt-2 px-4 py-1 rounded bg-blue-600 hover:bg-blue-700'
						>
							Close
						</button>
					</div>
				</div>
			)}
			<div className='flex flex-col h-screen w-screen bg-[#1e1e1e] text-gray-300'>
				{/* Title/Search Bar */}
				<div className='relative h-10 bg-[#2d2d2d] text-gray-300 flex items-center px-2'>
					{/* Centered Arrows + Search Bar */}
					<div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 w-[500px] max-w-full'>
						<button className='codicon codicon-arrow-left'></button>
						<button className='codicon codicon-arrow-right'></button>

						{/* Search Bar */}
						<div className='bg-[#3c3c3c] border border-[#555] rounded px-3 py-1 w-full max-w-md'>
							<div className='flex items-center justify-center gap-2 text-gray-400 text-sm h-4'>
								<span className='codicon codicon-search text-base'></span>
								<span className='select-none'>vs-whatsapp</span>
							</div>
						</div>
					</div>

					{/* Right-side Icons */}
					<div className='ml-auto flex items-center gap-2' id='title-bar-right'>
						<button className='codicon codicon-layout'></button>
						<button className='codicon codicon-layout-sidebar-left'></button>
						<button className='codicon codicon-layout-panel'></button>
						<button className='codicon codicon-layout-sidebar-right-off'></button>
					</div>
				</div>

				{/* Top Section: Activity Bar + Sidebar + Editor */}
				<div className='flex flex-1'>
					<div className='flex flex-col bg-[#333]'>
						{/* Activity Bar */}
						<aside className='bg-[#333] flex flex-col w-10 gap-5 py-3 pr-10'>
							<button className='codicon codicon-files bg-transparent text-white border-0 border-l-2 border-[#007acc] h-10 pl-3'></button>
							<button className='codicon codicon-search bg-transparent border-none outline-none text-gray-400 pl-3'></button>
							<button className='codicon codicon-git-branch bg-transparent border-none outline-none text-gray-400 pl-3'></button>
							<button className='codicon codicon-debug-alt bg-transparent border-none outline-none text-gray-400 pl-3'></button>
							<button className='codicon codicon-extensions bg-transparent border-none outline-none text-gray-400 pl-3'></button>
						</aside>

						<aside className='bg-[#333] flex flex-col mt-auto w-10 gap-5 py-3 pr-10 pl-4'>
							<button className='codicon codicon-account bg-transparent border-none outline-none text-gray-400'></button>
							<button className='codicon codicon-settings-gear bg-transparent border-none outline-none text-gray-400'></button>
						</aside>
					</div>

					{/* Side Bar */}
					<nav className='w-60 bg-[#252526] p-2 overflow-y-auto'>
						{/* File Explorer, etc. */}
						<div className='flex flex-col'>
							{contacts.map((contact) => (
								<button
									key={contact.id._serialized}
									className='flex items-center gap-2 py-1 px-2 text-white'
									onClick={() => getMessages(contact.id._serialized)}
								>
									<img src={jsIcon} alt='icon' className='w-4 h-4' />
									{contact.name}
								</button>
							))}
						</div>
					</nav>

					{/* Editor Area */}
					<section className='flex-1 bg-[#1e1e1e]'>
						{/* Tabs Bar */}
						<div className='flex bg-[#2d2d2d] border-b border-[#444] text-white text-sm'>
							{tabs.map((tabId) => {
								const contact = contacts.find(
									(c) => c.id._serialized === tabId
								);
								const isActive = tabId === activeContact;

								return (
									<div
										key={tabId}
										className={`px-4 py-2 cursor-pointer flex items-center gap-2 border-r border-[#444] ${
											isActive ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] text-gray-400'
										}`}
									>
										{/* Clicking name activates the tab */}
										<span
											onClick={() => getMessages(tabId)}
											className='inline-flex items-center gap-2'
										>
											<img src={jsIcon} alt='icon' className='w-4 h-4' />
											{contact?.name || 'Unknown'}
										</span>

										{/* Close Icon */}
										<button
											onClick={(e) => {
												e.stopPropagation(); // Prevent triggering tab switch
												handleCloseTab(tabId);
											}}
											className='codicon codicon-chrome-close ml-2 text-gray-500 hover:text-white'
										></button>
									</div>
								);
							})}
						</div>

						<Editor
							height='60%'
							value={editorText}
							language='javascript'
							theme='vs-dark'
							onMount={(editor) => {
								editorRef.current = editor;
								const lineCount = editor.getModel().getLineCount();
								editor.revealLine(lineCount - 2);
							}}
							options={{
								fontSize: 16, // Increase code font size
								lineNumbersMinChars: 3, // Adjust width for line numbers
								lineHeight: 24, // Optional: increase line spacing
								fontFamily: 'monospace',
								readOnly: true,
								wordWrap: 'on', // Enable word wrap
								wrappingIndent: 'same',
							}}
						/>
						{/* Terminal Tabs */}
						<div className='bg-[#1e1e1e] border-t border-[#333]'>
							<div className='flex text-sm'>
								{['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL'].map(
									(tab, i) => (
										<div
											key={i}
											className={`px-4 py-2 cursor-pointer ${
												tab === 'TERMINAL'
													? 'bg-[#1e1e1e] border-b-2 border-[#007acc] text-white'
													: 'text-gray-400'
											}`}
										>
											{tab}
										</div>
									)
								)}
							</div>

							{/* Terminal Content */}
							<div className='bg-[#1e1e1e] text-white h-40 px-4 py-2 font-mono text-sm overflow-y-auto'>
								{/* Input line */}
								<div className='flex items-center mt-2'>
									<span className='text-green-400'>saad@vs-whatsapp:~$</span>
									<input
										type='text'
										placeholder=''
										className='bg-transparent text-white outline-none ml-2 flex-1'
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												sendMessage(e.target.value);
												e.target.value = '';
											}
										}}
									/>
								</div>
							</div>
						</div>
					</section>
				</div>

				{/* Status Bar */}
				<div className=' bg-[#007acc] text-white text-sm flex justify-end items-center px-4 gap-6'>
					<span>Ln 1, Col 1</span>
					<span>Spaces: 2</span>
					<span>UTF-8</span>
				</div>
			</div>
		</>
	);
}

export default App;
