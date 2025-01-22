import React, { useState, useEffect } from "react";
import axios from "axios";
import FeedForm from "./FeedForm";

const FeedList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await axios.get("/api/posts");
      setPosts(res.data);
    } catch (err) {
      setError("Error fetching posts");
    } finally {
      setLoading(false);
    }
  };

  const handlePostAdded = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <FeedForm onPostAdded={handlePostAdded} />

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {posts.map((post) => (
          <div
            key={post._id}
            className="bg-white shadow sm:rounded-lg overflow-hidden"
          >
            <img
              src={post.imageUrl}
              alt="Post"
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <p className="text-gray-900">{post.caption}</p>
              <div className="mt-2 text-sm text-gray-500">
                Posted by {post.user.name} on{" "}
                {new Date(post.date).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedList;
