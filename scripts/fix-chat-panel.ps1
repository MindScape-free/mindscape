$file = 'src\components\chat-panel.tsx'
$content = [System.IO.File]::ReadAllText($file)

# Find the start marker
$startMarker = '{message.role === ''ai'' && ('
$endMarker = "                          )}`r`n`r`n                          {/* Pin button - available for all text messages */}"

$startIdx = $content.IndexOf($startMarker)
if ($startIdx -lt 0) { Write-Host "START NOT FOUND"; exit 1 }

# Find the end of the pin button block
$pinEnd = "                          )}"
# We need to find the second occurrence after the AI block
$searchFrom = $startIdx + 100

# Find "Pin button" comment
$pinCommentIdx = $content.IndexOf("{/* Pin button - available for all text messages */}", $searchFrom)
if ($pinCommentIdx -lt 0) { Write-Host "PIN COMMENT NOT FOUND"; exit 1 }

# Find the closing )} after the pin button block
$pinBlockEnd = $content.IndexOf("                          )}", $pinCommentIdx)
if ($pinBlockEnd -lt 0) { Write-Host "PIN BLOCK END NOT FOUND"; exit 1 }
$pinBlockEnd += "                          )}".Length

# The full old block runs from $startIdx to $pinBlockEnd
# But we need to include the blank line before {/* Pin button */}
# Find the actual start of the AI block (go back to find the full line)
$blockStart = $content.LastIndexOf("`r`n", $startIdx) + 2
# Actually just use $startIdx directly since we want to replace from there

$oldBlock = $content.Substring($startIdx, $pinBlockEnd - $startIdx)

$newBlock = @'
{isTextMessage && !streamingIds.has(message.id) && (
                            <div className="flex items-center gap-1 px-3 pb-2 pt-0">
                              {streamingIds.has(message.id) && streamingMessages[message.id] && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={stopStream}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Stop</TooltipContent></Tooltip></TooltipProvider>
                              )}
                              {message.role === 'ai' && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleCopyMessage(streamingMessages[message.id] || message.content, index)}>
                                    {copiedIndex === index ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </TooltipTrigger><TooltipContent>Copy</TooltipContent></Tooltip></TooltipProvider>
                              )}
                              {message.role === 'ai' && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleRegenerate(index)}>
                                    <RefreshCw className={cn("h-3 w-3", isLoading && index === messages.length - 1 && "animate-spin")} />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Regenerate</TooltipContent></Tooltip></TooltipProvider>
                              )}
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className={cn("h-6 w-6 transition-all", message.isPinned ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-amber-400")}
                                  onClick={() => togglePinMessage(message.id)}
                                >
                                  <motion.div animate={message.isPinned ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                                    <Pin className={cn("h-3 w-3", message.isPinned && "fill-current")} />
                                  </motion.div>
                                </Button>
                              </TooltipTrigger><TooltipContent>{message.isPinned ? 'Unpin' : 'Pin'}</TooltipContent></Tooltip></TooltipProvider>
                            </div>
                          )}
'@

$newBlock = $newBlock.TrimEnd()

$result = $content.Replace($oldBlock, $newBlock)
if ($result -eq $content) {
    Write-Host "NO CHANGE - old block length: $($oldBlock.Length)"
    Write-Host "First 200 chars of old block:"
    Write-Host $oldBlock.Substring(0, [Math]::Min(200, $oldBlock.Length))
} else {
    [System.IO.File]::WriteAllText($file, $result)
    Write-Host "Done fix 6 - merged action buttons"
}
