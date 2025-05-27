"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  MoreHorizontal,
  X,
  ArrowLeft,
  ChevronDown,
  Eye,
  List,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { supabase } from "@/lib/supabase"
import { useRouter } from 'next/navigation'



interface Idea {
  id: string
  title: string
  description: string
  createdAt: number
  folderId?: string
}

interface IdeaFolder {
  id: string
  name: string
  createdAt: number
}

type ViewMode = "home" | "ideas" | "folders" | "idea-detail"

export default function IdeaPad() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [folders, setFolders] = useState<IdeaFolder[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("home")
  useEffect(() => {
  const savedView = localStorage.getItem("ideaPad_view") as ViewMode | null

  if (savedView === "idea-detail") {
    // fallback to ideas if there's no selected idea
    setViewMode("ideas")
  } else if (savedView) {
    setViewMode(savedView)
  }
}, [])

  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [previousView, setPreviousView] = useState<ViewMode>("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewIdeaOpen, setIsNewIdeaOpen] = useState(false)
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [editingFolder, setEditingFolder] = useState<IdeaFolder | null>(null)
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const router = useRouter()



  // supabase
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
      setLoading(false)
    })
  }, [])


  useEffect(() => {
  localStorage.setItem("ideaPad_view", viewMode)
}, [viewMode])



  // Form states
  const [newIdeaTitle, setNewIdeaTitle] = useState("")
  const [newIdeaDescription, setNewIdeaDescription] = useState("")
  const [newFolderName, setNewFolderName] = useState("")

  // Load data from supabase
  useEffect(() => {
  if (!user) return;

  const fetchData = async () => {
    const [ideasRes, foldersRes] = await Promise.all([
      supabase.from("ideas").select("*").eq("user_id", user.id).order("createdAt", { ascending: false }),
      supabase.from("folders").select("*").eq("user_id", user.id).order("createdAt", { ascending: false })
    ])

    if (ideasRes.data) {
      const normalizedIdeas = ideasRes.data.map((idea) => ({
        ...idea,
        folderId: idea.folder_id, // normalize for your UI
      }))
      setIdeas(normalizedIdeas)
    }

    if (foldersRes.data) setFolders(foldersRes.data)

    if (ideasRes.error && ideasRes.error.message) {
    console.error("Error loading ideas:", ideasRes.error.message)
    }
    if (foldersRes.error && foldersRes.error.message) {
      console.error("Error loading folders:", foldersRes.error.message)
  }

  }

  fetchData()
}, [user])


  // Navigation functions
  const navigateToView = (newView: ViewMode, idea?: Idea) => {
    setPreviousView(viewMode)
    setViewMode(newView)
    if (idea) {
      setSelectedIdea(idea)
    }
  }

  const goBack = () => {
    setViewMode(previousView)
    setSelectedIdea(null)
  }

  const goHome = () => {
    setViewMode("home")
    setSelectedIdea(null)
    setPreviousView("home")
  }

  // Create new idea
  const createIdea = async () => {
  if (!newIdeaTitle.trim() || !user) return

  const newIdea = {
    title: newIdeaTitle.trim(),
    description: newIdeaDescription.trim(),
    createdAt: Date.now(),
    folder_id: null,
    user_id: user.id,
  }

  const { data, error } = await supabase.from("ideas").insert([newIdea]).select()

  if (error) {
    console.error("Failed to create idea:", error)
    return
  }

  if (data) {
    setIdeas((prev) => [data[0], ...prev])
    setNewIdeaTitle("")
    setNewIdeaDescription("")
    setIsNewIdeaOpen(false)
  }
}


  // Create new folder
  const createFolder = async () => {
  if (!newFolderName.trim() || !user) return;

  const newFolder = {
    name: newFolderName.trim(),
    createdAt: Date.now(),
    user_id: user.id,
  }

  const { data, error } = await supabase.from("folders").insert([newFolder]).select()

  if (error) {
    console.error("Failed to create folder:", error)
    return
  }

  if (data) {
    setFolders((prev) => [...prev, data[0]])
    setNewFolderName("")
    setIsNewFolderOpen(false)
  }
}


  // Update idea
  const updateIdea = async (updatedIdea: Idea) => {
  const { error } = await supabase
    .from("ideas")
    .update({
      title: updatedIdea.title,
      description: updatedIdea.description,
      folder_id: updatedIdea.folderId ?? null,
    })
    .eq("id", updatedIdea.id)

  if (error) {
    console.error("Failed to update idea:", error)
    return
  }

  setIdeas((prev) =>
    prev.map((idea) => (idea.id === updatedIdea.id ? updatedIdea : idea))
  )
  setEditingIdea(null)
}


  // Delete idea
  const deleteIdea = async (ideaId: string) => {
  const { error } = await supabase.from("ideas").delete().eq("id", ideaId)

  if (error) {
    console.error("Failed to delete idea:", error)
    return
  }

  setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))

  if (selectedIdea?.id === ideaId) {
    goBack()
  }
}

  // Update folder
  const updateFolder = async (updatedFolder: IdeaFolder) => {
  const { error } = await supabase
    .from("folders")
    .update({ name: updatedFolder.name })
    .eq("id", updatedFolder.id)

  if (error) {
    console.error("Failed to update folder:", error)
    return
  }

  setFolders((prev) =>
    prev.map((folder) => (folder.id === updatedFolder.id ? updatedFolder : folder))
  )
  setEditingFolder(null)
}


  // Delete folder
  const deleteFolder = async (folderId: string) => {
  // 1. Set folder_id to null for all ideas in the folder
  const { error: updateError } = await supabase
    .from("ideas")
    .update({ folder_id: null })
    .eq("folder_id", folderId)

  if (updateError) {
    console.error("Failed to remove ideas from folder:", updateError)
    return
  }

  // 2. Delete the folder itself
  const { error: deleteError } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)

  if (deleteError) {
    console.error("Failed to delete folder:", deleteError)
    return
  }

  // 3. Update UI state
  setIdeas((prev) =>
    prev.map((idea) =>
      idea.folderId === folderId ? { ...idea, folderId: undefined } : idea
    )
  )
  setFolders((prev) => prev.filter((folder) => folder.id !== folderId))
}


  // Move idea to folder
  const moveIdeaToFolder = async (ideaId: string, folderId: string | null) => {
  setIdeas((prev) =>
    prev.map((idea) =>
      idea.id === ideaId ? { ...idea, folderId: folderId || undefined } : idea
    )
  )

  // Persist the folder assignment
  const { error } = await supabase
    .from("ideas")
    .update({ folder_id: folderId }) // <-- matches Supabase column name
    .eq("id", ideaId)

  if (error) {
    console.error("Failed to update folder assignment:", error)
  }
}


  // Create folder and assign idea
  const createFolderAndAssign = async (ideaId: string, folderName: string) => {
  if (!folderName.trim() || !user) return

  const newFolder = {
    name: folderName.trim(),
    createdAt: Date.now(),
    user_id: user.id,
  }

  const { data, error } = await supabase.from("folders").insert([newFolder]).select()

  if (error || !data) {
    console.error("Failed to create and assign folder:", error)
    return
  }

  const createdFolder = data[0]
  setFolders((prev) => [...prev, createdFolder])
  moveIdeaToFolder(ideaId, createdFolder.id)
}


  // Toggle folder open/closed
  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // Filter ideas based on search query
  const filteredIdeas = ideas.filter((idea) => {
    return searchQuery
      ? idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          idea.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  })

  // Filter folders based on search query
  const filteredFolders = folders.filter((folder) => {
    return searchQuery ? folder.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  })

  // Get folder name by id
  const getFolderName = (folderId?: string) => {
    if (!folderId) return null
    return folders.find((folder) => folder.id === folderId)?.name
  }

  // Get ideas in folder
  const getIdeasInFolder = (folderId: string) => {
    return ideas.filter((idea) => idea.folderId === folderId)
  }

  // Get ideas not in any folder
  const getUnfolderedIdeas = () => {
    return ideas.filter((idea) => !idea.folderId)
  }

//  supabase login
  if (loading) {
  return <div className="min-h-screen flex items-center justify-center">Loading...</div>
}

if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      <div>
        <p className="text-lg text-gray-700 mb-4">You must be logged in to use ideaPad.</p>
        <a href="/auth" className="text-blue-600 underline">Go to Login</a>
      </div>
    </div>
  )
}



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900">ideaPad</h1>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push("/auth")
                }}
              >
                Sign Out
              </Button>
            </div>

            {/* Responsive View Toggle */}
            {viewMode !== "home" && viewMode !== "idea-detail" && (
              <div className="flex items-center gap-2">
                {/* Desktop toggle */}
                <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "ideas" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("ideas")}
                  >
                    <List className="w-4 h-4 mr-1" />
                    Ideas
                  </Button>
                  <Button
                    variant={viewMode === "folders" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("folders")}
                  >
                    <Folder className="w-4 h-4 mr-1" />
                    Folders
                  </Button>
                </div>

                {/* Mobile hamburger toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="sm:hidden">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setViewMode("ideas")}>Ideas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode("folders")}>Folders</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Back Button */}
            {viewMode === "idea-detail" && (
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {/* Home Button */}
            {viewMode !== "home" && (
              <Button variant="outline" onClick={goHome}>
                Home
              </Button>
            )}

            {/* Search (only in ideas/folders view) */}
            {(viewMode === "ideas" || viewMode === "folders") && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={viewMode === "ideas" ? "Search ideas..." : "Search folders..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            )}

            {/* New Idea Button */}
            {viewMode === "folders" ? (
              <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                <DialogTrigger asChild>
                  <Button className="hidden sm:flex bg-blue-600 hover:bg-blue-700">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-sm sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Give your brilliance a home. Organize your ideas like a true visionary. Every great mind needs structure.
                    </DialogDescription>

                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNewFolderOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                        Create Folder
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={isNewIdeaOpen} onOpenChange={setIsNewIdeaOpen}>
                <DialogTrigger asChild>
                  <Button className="hidden sm:flex bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Idea
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-sm sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Idea</DialogTitle>
                    <DialogDescription>
                      Got a spark of genius? Capture it now before it disappears. The next big thing might start right here.
                    </DialogDescription>

                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Idea title..."
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Describe your idea..."
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNewIdeaOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createIdea} disabled={!newIdeaTitle.trim()}>
                        Create Idea
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Home View */}
        {viewMode === "home" && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {ideas.length === 0 ? "Welcome to ideaPad" : "Ready for your next idea?"}
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {ideas.length === 0
                  ? "Capture your brilliant ideas and organize them your way. Start by creating your first idea!"
                  : "Keep the momentum going! Add another brilliant idea to your collection."}
              </p>
            </div>

            <div className="space-y-4">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 h-auto"
                onClick={() => setIsNewIdeaOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                {ideas.length === 0 ? "Create Your First Idea" : "Create New Idea"}
              </Button>

              {ideas.length > 0 && (
                <div className="pt-8">
                  <p className="text-gray-600 mb-4">You have {ideas.length} ideas saved</p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => setViewMode("ideas")}>
                      <Eye className="w-4 h-4 mr-2" />
                      View All Ideas
                    </Button>
                    <Button variant="outline" onClick={() => setViewMode("folders")}>
                      <Folder className="w-4 h-4 mr-2" />
                      View Folders
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ideas View */}
        {viewMode === "ideas" && (
          <div className="px-4 max-w-md sm:max-w-2xl mx-auto space-y-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">All Ideas</h2>
                <button
                  className="text-sm text-blue-600 hover:underline sm:hidden"
                  onClick={() => setIsNewIdeaOpen(true)}
                >
                  new
                </button>
              </div>

              <p className="text-gray-600">{filteredIdeas.length} ideas</p>
            </div>

            {filteredIdeas.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <List className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "No ideas match your search" : "No ideas yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? "Try a different search term." : "Start by creating your first idea!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIdeas.map((idea) => (
                  <Card
                    key={idea.id}
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => navigateToView("idea-detail", idea)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {idea.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {idea.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">
                              {new Date(idea.createdAt).toLocaleDateString()}
                            </span>
                            {idea.folderId && (
                              <Badge variant="outline" className="text-xs">
                                {getFolderName(idea.folderId)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Folders View */}
        {viewMode === "folders" && (
          <div className="px-4 max-w-md sm:max-w-2xl mx-auto space-y-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Folders</h2>
                <button
                  className="text-sm text-blue-600 hover:underline sm:hidden"
                  onClick={() => setIsNewFolderOpen(true)}
                >
                  new
                </button>
              </div>

              <p className="text-gray-600">{filteredFolders.length} folders</p>
            </div>

            <div className="space-y-4">
              {/* Unfoldered Ideas */}
              {getUnfolderedIdeas().length > 0 && (
                <Collapsible open={openFolders.has("unfoldered")} onOpenChange={() => toggleFolder("unfoldered")}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                openFolders.has("unfoldered") ? "rotate-180" : ""
                              }`}
                            />
                            <Folder className="w-5 h-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">Unorganized Ideas</CardTitle>
                              <p className="text-sm text-gray-600">Ideas not in any folder</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{getUnfolderedIdeas().length}</Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2 pl-7">
                          {getUnfolderedIdeas().map((idea) => (
                            <div
                              key={idea.id}
                              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => navigateToView("idea-detail", idea)}
                            >
                              <span className="text-sm font-medium hover:text-blue-600 transition-colors">
                                {idea.title}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(idea.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Folders */}
              {filteredFolders.map((folder) => {
                const folderIdeas = getIdeasInFolder(folder.id)
                return (
                  <Collapsible
                    key={folder.id}
                    open={openFolders.has(folder.id)}
                    onOpenChange={() => toggleFolder(folder.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${
                                  openFolders.has(folder.id) ? "rotate-180" : ""
                                }`}
                              />
                              <Folder className="w-5 h-5 text-blue-600" />
                              <div>
                                <CardTitle className="text-lg">{folder.name}</CardTitle>
                                <p className="text-sm text-gray-600">
                                  Created {new Date(folder.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{folderIdeas.length}</Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingFolder(folder)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteFolder(folder.id)} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {folderIdeas.length === 0 ? (
                            <p className="text-sm text-gray-500 italic pl-7">No ideas in this folder yet</p>
                          ) : (
                            <div className="space-y-2 pl-7">
                              {folderIdeas.map((idea) => (
                                <div
                                  key={idea.id}
                                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                                  onClick={() => navigateToView("idea-detail", idea)}
                                >
                                  <span className="text-sm font-medium hover:text-blue-600 transition-colors">
                                    {idea.title}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(idea.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}

              {filteredFolders.length === 0 && getUnfolderedIdeas().length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Folder className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "No folders match your search" : "No folders yet"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery ? "Try a different search term." : "Create folders to organize your ideas"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsNewFolderOpen(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create Your First Folder
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idea Detail View */}
        {viewMode === "idea-detail" && selectedIdea && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{selectedIdea.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Created {new Date(selectedIdea.createdAt).toLocaleDateString()}</span>
                      {selectedIdea.folderId && <Badge variant="outline">{getFolderName(selectedIdea.folderId)}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Folder className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add "{selectedIdea.title}" to Folder</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            Would you like to add this idea to an existing folder or create a new one?
                          </p>

                          <div className="space-y-3">
                            {/* Add to Existing Folder */}
                            <div>
                              <h4 className="font-medium mb-2">Add to Existing Folder</h4>
                              {folders.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {folders.map((folder) => (
                                    <Button
                                      key={folder.id}
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => {
                                        moveIdeaToFolder(selectedIdea.id, folder.id)
                                        setSelectedIdea({ ...selectedIdea, folderId: folder.id })
                                        // Close dialog
                                        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
                                      }}
                                    >
                                      <Folder className="w-4 h-4 mr-2" />
                                      {folder.name}
                                      <Badge variant="secondary" className="ml-auto">
                                        {ideas.filter((i) => i.folderId === folder.id).length}
                                      </Badge>
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No folders created yet</p>
                              )}
                            </div>

                            {/* Create New Folder */}
                            <div>
                              <h4 className="font-medium mb-2">Create New Folder</h4>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Enter folder name..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const folderName = e.currentTarget.value.trim()
                                      if (folderName) {
                                        createFolderAndAssign(selectedIdea.id, folderName)
                                        setSelectedIdea({
                                          ...selectedIdea,
                                          folderId: folders.find((f) => f.name === folderName)?.id,
                                        })
                                        e.currentTarget.value = ""
                                        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  onClick={(e) => {
                                    const input = e.currentTarget.parentElement?.querySelector(
                                      "input",
                                    ) as HTMLInputElement
                                    const folderName = input?.value.trim()
                                    if (folderName) {
                                      createFolderAndAssign(selectedIdea.id, folderName)
                                      const newFolder = {
                                        id: Date.now().toString(),
                                        name: folderName,
                                        createdAt: Date.now(),
                                      }
                                      setSelectedIdea({ ...selectedIdea, folderId: newFolder.id })
                                      input.value = ""
                                      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
                                    }
                                  }}
                                >
                                  <FolderPlus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Remove from Folder (if idea is in a folder) */}
                            {selectedIdea.folderId && (
                              <div>
                                <h4 className="font-medium mb-2">Current Folder</h4>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">
                                    Currently in: <strong>{getFolderName(selectedIdea.folderId)}</strong>
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      moveIdeaToFolder(selectedIdea.id, null)
                                      setSelectedIdea({ ...selectedIdea, folderId: undefined })
                                      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="sm" onClick={() => setEditingIdea(selectedIdea)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteIdea(selectedIdea.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedIdea.description}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Edit Idea Dialog */}
      <Dialog open={!!editingIdea} onOpenChange={() => setEditingIdea(null)}>
        <DialogContent className="w-[90vw] max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogDescription>
              edit your idea.
            </DialogDescription>
            <DialogTitle>Edit Idea</DialogTitle>
          </DialogHeader>
          {editingIdea && (
            <div className="space-y-4">
              <Input
                value={editingIdea.title}
                onChange={(e) => setEditingIdea({ ...editingIdea, title: e.target.value })}
              />
              <Textarea
                value={editingIdea.description}
                onChange={(e) => setEditingIdea({ ...editingIdea, description: e.target.value })}
                rows={6}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingIdea(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateIdea(editingIdea)
                    if (selectedIdea?.id === editingIdea.id) {
                      setSelectedIdea(editingIdea)
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
        <DialogContent className="w-[90vw] max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogDescription>
              Rename folder.
            </DialogDescription>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          {editingFolder && (
            <div className="space-y-4">
              <Input
                value={editingFolder.name}
                onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingFolder(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateFolder(editingFolder)}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
