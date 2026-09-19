-- ============================================================
-- ABG Text Feedback via Railway
-- ============================================================

local FB = {
    endpoint = "https://abgfeedback-production.up.railway.app",
    auth     = "d3d664003e3a2c51500f4dbd94e2de95da0d1d7133520cbdc0171aab322afaf",
    testMode = true,
    minKills = 6,
}

local LOG = "/storage/emulated/0/Android/data/com.pubg.krmobile/files/UE4Game/ShadowTrackerExtra/ShadowTrackerExtra/Saved/Screenshots/tf.log"

local function trace(msg)
    local line = os.date("%H:%M:%S ") .. tostring(msg)
    print("[TF] " .. line)
    pcall(function()
        local h = io.open(LOG, "a")
        if h then h:write(line .. "\n") h:close() end
    end)
end

pcall(function()
    local h = io.open(LOG, "w")
    if h then h:write("# Started " .. os.date() .. "\n") h:close() end
end)
trace("boot")

local function tick()
    local t = package.loaded["common.time_ticker"]
    if t then return t end
    local ok, m = pcall(require, "common.time_ticker")
    if ok then return m end
    return nil
end

local function esc(s)
    if not s then return "" end
    s = tostring(s)
    s = s:gsub("\n", "\r\n")
    s = s:gsub("([^%w%-%_%.%% ])", function(c) return string.format("%%%02X", c:byte()) end)
    s = s:gsub(" ", "+")
    return s
end

local function rankLabel(r)
    r = tonumber(r) or 0
    if r >= 5600 then return "🏆 CONQUEROR" end
    if r >= 5200 then return "⭐ SUPREME" end
    if r >= 4700 then return "⭐ CHAMPION" end
    if r >= 4200 then return "👑 ACE" end
    if r >= 3700 then return "💎 DIAMOND" end
    if r >= 3200 then return "💎 PLATINUM" end
    if r >= 2700 then return "🥇 GOLD" end
    if r >= 2200 then return "🥈 SILVER" end
    return "🥉 BRONZE"
end

local function whoAmI()
    if _G.DataMgr and _G.DataMgr.roleData and _G.DataMgr.roleData.uid then
        return tostring(_G.DataMgr.roleData.uid)
    end
    if _G._NTH_UK then return tostring(_G._NTH_UK) end
    return "0"
end

local function getPlayerName()
    local n = "Unknown"
    pcall(function()
        local pc = slua_GameFrontendHUD and slua_GameFrontendHUD:GetPlayerController()
        if slua.isValid(pc) then
            local ch = pc:GetPlayerCharacterSafety()
            if slua.isValid(ch) then
                n = ch:GetPlayerNameSafety() or "Unknown"
            end
        end
    end)
    return n
end

local function getRank(fallbackKills)
    local rank, kills = 0, tonumber(fallbackKills) or 0
    pcall(function()
        local BR = _G.BP_STRUCT_BattleResultData
        local rating = BR and (BR.rating or BR.BP_STRUCT_BTRating)
        if rating then rank = tonumber(rating.rank_rating) or 0 end
        if rank == 0 then
            local rd = _G.DataMgr and _G.DataMgr.roleData
            if rd and rd.segment_rating then
                for _, v in pairs(rd.segment_rating) do
                    if type(v) == "table" then
                        for _, nv in pairs(v) do
                            if type(nv) == "number" and nv > rank then rank = nv end
                        end
                    elseif type(v) == "number" and v > rank then
                        rank = v
                    end
                end
            end
        end
    end)
    return rank, kills
end

local function sendText(kills)
    local uid = whoAmI()
    local masked = uid
    if #uid > 5 then masked = uid:sub(1, 3) .. "***" .. uid:sub(-2) end

    local name = getPlayerName()
    local rank, finalKills = getRank(kills)

    local text =
        "🏆 <b>ABG MOD VIP</b> 🏆\n" ..
        "━━━━━━━━━━━━━━━\n" ..
        "⏰ " .. os.date("%H:%M:%S %d/%m/%Y") .. "\n" ..
        "👤 " .. name .. "\n" ..
        "🔑 " .. masked .. "\n" ..
        "🔫 Kills: <b>" .. finalKills .. "</b>\n" ..
        "🎖 " .. rankLabel(rank)

    local h = package.loaded["client.slua.logic.http.http_manager"]
    if not h then
        local ok, m = pcall(require, "client.slua.logic.http.http_manager")
        if ok then h = m end
    end
    if not h or type(h.Post) ~= "function" then
        trace("no http manager")
        return
    end

    local body = "text=" .. esc(text)
    trace("POST railway, " .. #body .. "B")

    h:Post(
        FB.endpoint,
        {
            ["Content-Type"] = "application/x-www-form-urlencoded",
            ["X-ABG-Auth"]   = FB.auth,
        },
        body,
        nil,
        function(ok, _, resp, err)
            local r = tostring(resp or err or ""):sub(1, 150)
            trace("resp ok=" .. tostring(ok) .. " r=" .. r)
        end,
        60
    )
end

local function winnerHook()
    pcall(function()
        local UM = _G.UIManager
        if not UM or not UM.ShowUI or UM.__TFHooked then return end
        UM.__TFHooked = true
        trace("hook installed")

        local orig = UM.ShowUI
        UM.ShowUI = function(cfg, par, ...)
            local out = orig(cfg, par, ...)
            pcall(function()
                local gc = UM.UI_Config_InGame
                local win = gc and gc.GameOverCountDown_UIBP
                if not win or cfg ~= win then return end
                if not (par and (par.Reason == "win" or par.ShowedWinLogo)) then return end
                trace("winner detected")

                local k = 0
                pcall(function()
                    local util = package.loaded["GameLua.Mod.BaseMod.Client.Like.IngameLikeUtilClient"]
                    if util and util.GetMyPlayerState then
                        local ps = util:GetMyPlayerState()
                        if ps and ps.Kills then k = tonumber(ps.Kills) or 0 end
                    end
                end)

                if k < FB.minKills then
                    trace("skip kills=" .. k)
                    return
                end

                sendText(k)
            end)
            return out
        end
    end)
end

local function boot()
    trace("boot testMode=" .. tostring(FB.testMode))

    if FB.testMode then
        local tk = tick()
        if tk and tk.AddTimerOnce then
            tk.AddTimerOnce(5, function()
                trace("test trigger")
                sendText(10)
            end)
        end
    end

    local tk = tick()
    if tk and tk.AddTimer then
        tk.AddTimer(3, winnerHook)
    else
        winnerHook()
    end
end

boot()
